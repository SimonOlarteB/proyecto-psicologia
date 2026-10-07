 import { NextResponse } from "next/server";
        import crypto from "crypto";
        import pool from "@/app/lib/db";
        import { enviarCorreo } from "@/app/lib/email";

        export const runtime = "nodejs";

        function escaparHtml(valor: unknown): string {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        }

        function compararTokens(
        tokenRecibido: string,
        tokenGuardado: string
        ): boolean {
        const recibido = Buffer.from(tokenRecibido, "utf8");
        const guardado = Buffer.from(tokenGuardado, "utf8");

        return (
            recibido.length === guardado.length &&
            crypto.timingSafeEqual(recibido, guardado)
        );
        }

        function formatearFecha(fecha: string): string {
        const [anio, mes, dia] = String(fecha)
            .slice(0, 10)
            .split("-")
            .map(Number);

        return new Date(anio, mes - 1, dia).toLocaleDateString(
            "es-CO",
            {
            day: "numeric",
            month: "long",
            year: "numeric",
            }
        );
        }

        function formatearHora(hora: string): string {
        const [horas, minutos] = String(hora)
            .slice(0, 5)
            .split(":")
            .map(Number);

        const fecha = new Date();
        fecha.setHours(horas, minutos, 0, 0);

        return fecha.toLocaleTimeString("es-CO", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
        }

        export async function POST(
        request: Request,
        context: { params: Promise<{ id: string }> }
        ) {
        try {
            const { id } = await context.params;

            if (!/^\d+$/.test(id)) {
            return NextResponse.json(
                { error: "Identificador de cita no válido." },
                { status: 400 }
            );
            }

            const body = await request.json().catch(() => null);
            const token = body?.token;

            if (
            typeof token !== "string" ||
            !/^[a-f0-9]{64}$/i.test(token)
            ) {
            return NextResponse.json(
                { error: "El enlace de confirmación no es válido." },
                { status: 400 }
            );
            }

            const [filas]: any = await pool.query(
            `
                SELECT
                c.id,
                c.fecha,
                c.hora,
                c.estado,
                c.asistencia_confirmada,
                c.token_confirmacion,

                cl.nombre_completo AS cliente_nombre,
                cl.email AS cliente_email,
                cl.telefono AS cliente_telefono,

                s.nombre AS servicio_nombre,

                cg.correo AS correo_psicologa

                FROM citas c

                INNER JOIN clientes cl
                ON c.cliente_id = cl.id

                INNER JOIN servicios s
                ON c.servicio_id = s.id

                LEFT JOIN configuracion_general cg
                ON cg.id = 1

                WHERE c.id = ?
                LIMIT 1
            `,
            [id]
            );

            if (filas.length === 0) {
            return NextResponse.json(
                { error: "No encontramos esta cita." },
                { status: 404 }
            );
            }

            const cita = filas[0];

            if (
            !cita.token_confirmacion ||
            !compararTokens(token, cita.token_confirmacion)
            ) {
            return NextResponse.json(
                { error: "El enlace no es válido o ha expirado." },
                { status: 403 }
            );
            }

            if (cita.estado !== "CONFIRMADA") {
            return NextResponse.json(
                {
                error:
                    "Esta cita ya no está en estado CONFIRMADA.",
                },
                { status: 409 }
            );
            }

            if (Number(cita.asistencia_confirmada) === 1) {
            return NextResponse.json({
                mensaje: "Tu asistencia ya había sido confirmada.",
                confirmada: true,
            });
            }

            if (!cita.correo_psicologa) {
            console.error(
                "No hay correo configurado para la psicóloga."
            );

            return NextResponse.json(
                {
                error:
                    "No se encontró el correo de la psicóloga.",
                },
                { status: 500 }
            );
            }

            // Actualizar solamente si aún no se ha confirmado.
            // El estado de la cita permanece CONFIRMADA.
            const [resultado]: any = await pool.query(
            `
                UPDATE citas
                SET asistencia_confirmada = 1
                WHERE id = ?
                AND estado = 'CONFIRMADA'
                AND asistencia_confirmada = 0
                AND token_confirmacion = ?
            `,
            [id, token]
            );

            if (resultado.affectedRows === 0) {
            return NextResponse.json({
                mensaje: "La asistencia ya había sido confirmada.",
                confirmada: true,
            });
            }

            const nombre = escaparHtml(cita.cliente_nombre);
            const servicio = escaparHtml(cita.servicio_nombre);
            const fecha = escaparHtml(
            formatearFecha(cita.fecha)
            );
            const hora = escaparHtml(
            formatearHora(cita.hora)
            );
            const correoPaciente = escaparHtml(cita.cliente_email);
            const telefonoPaciente = escaparHtml(
            cita.cliente_telefono || "No registrado"
            );

            await enviarCorreo({
            para: cita.correo_psicologa,
            asunto: "Un paciente confirmó su asistencia",
            html: `
                <div style="
                margin:0;
                padding:35px 15px;
                background:#F7F1E9;
                font-family:Arial,sans-serif;
                color:#3F4635;
                ">
                <div style="
                    max-width:600px;
                    margin:0 auto;
                    padding:35px;
                    background:#ffffff;
                    border-radius:16px;
                ">
                    <p style="
                    color:#C56835;
                    text-align:center;
                    font-size:14px;
                    ">
                    Aura Elisa Sánchez
                    </p>

                    <h1 style="
                    text-align:center;
                    font-size:26px;
                    font-weight:400;
                    ">
                    Asistencia confirmada
                    </h1>

                    <p style="font-size:16px;line-height:1.7;">
                    Hola Aura Elisa,
                    </p>

                    <p style="font-size:16px;line-height:1.7;">
                    <strong>${nombre}</strong> ha confirmado
                    su asistencia a la siguiente cita:
                    </p>

                    <div style="
                    padding:20px;
                    background:#F7F1E9;
                    border-radius:12px;
                    line-height:1.9;
                    ">
                    <strong>Servicio:</strong> ${servicio}<br>
                    <strong>Fecha:</strong> ${fecha}<br>
                    <strong>Hora:</strong> ${hora}<br>
                    <strong>Correo del paciente:</strong>
                    ${correoPaciente}<br>
                    <strong>Teléfono del paciente:</strong>
                    ${telefonoPaciente}
                    </div>

                    <p style="font-size:14px;line-height:1.7;">
                    El estado de la cita continúa siendo
                    <strong>CONFIRMADA</strong>.
                    </p>
                </div>
                </div>
            `,
            });

            return NextResponse.json({
            mensaje:
                "Tu asistencia fue confirmada correctamente.",
            confirmada: true,
            });
        } catch (error) {
            console.error(
            "Error al confirmar la asistencia:",
            error
            );

            return NextResponse.json(
            {
                error:
                "Ocurrió un error al procesar la confirmación.",
            },
            { status: 500 }
            );
        }
        }