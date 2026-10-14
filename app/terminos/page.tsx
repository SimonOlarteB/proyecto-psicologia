import type { Metadata } from "next";
import DocumentoLegal from "../components/DocumentoLegal";

export const metadata: Metadata = {
    title: "Condiciones del servicio | Aura Elisa Sánchez",
    description: "Condiciones para agendar y pagar citas en el sitio.",
};

const h2 = { fontSize: "1.3rem", margin: "2rem 0 0.5rem" } as const;

export default function Terminos() {
    return (
        <DocumentoLegal
            titulo="Condiciones del servicio"
            actualizado="13 de octubre de 2026"
        >
            <p>
                Estas condiciones regulan el uso de aurapsicohumana.com para
                agendar y pagar citas con Aura Elisa Sánchez, psicóloga. Al agendar
                una cita aceptas estas condiciones y la política de privacidad.
            </p>

            <h2 style={h2}>1. Qué ofrece el sitio</h2>
            <p>
                El sitio permite consultar servicios, reservar una cita presencial
                o virtual, pagarla en línea y recibir confirmación y recordatorios
                por correo. El sitio no ofrece atención de urgencias.
            </p>

            <h2 style={h2}>2. Si estás en una situación de urgencia</h2>
            <p>
                Si tú o alguien más está en peligro inmediato, no uses este sitio.
                Llama a la línea 123 o acude al servicio de urgencias más cercano.
            </p>

            <h2 style={h2}>3. Reserva y pago</h2>
            <ul>
                <li>La cita queda confirmada cuando el pago es aprobado.</li>
                <li>
                    Los pagos se procesan a través de Wompi; el sitio no almacena los
                    datos de tu tarjeta.
                </li>
                <li>Los precios se muestran en pesos colombianos (COP).</li>
            </ul>

            <h2 style={h2}>4. Citas virtuales</h2>
            <p>
                Recibirás por correo un enlace de Google Meet. Procura conectarte
                desde un lugar privado y con buena conexión. Si hay fallas técnicas
                de tu parte, el tiempo perdido no se repone.
            </p>

            <h2 style={h2}>5. Reprogramación y cancelación</h2>
            <p>
                Puedes reprogramar tu cita una vez, sin costo, hasta 12 horas antes de la hora
                acordada, usando el enlace que recibes en el correo de
                recordatorio. La nueva fecha depende de la disponibilidad de la profesional.

                Si necesitas cancelar, escribe a aurapsicohumana@gmail.com con al menos 24 horas de
                anticipación. En ese caso se te devolverá el 90% del valor pagado..
            </p>

            <h2 style={h2}>6. Tus responsabilidades</h2>
            <p>
                Debes dar datos de contacto veraces y llegar o conectarte a la hora
                acordada. Si tienes menos de 18 años, un padre, madre o
                representante legal debe agendar y autorizar la cita.
            </p>

            <h2 style={h2}>7. Confidencialidad</h2>
            <p>
                Lo que hables en consulta es confidencial, con las excepciones que
                establece la ley y el código deontológico de la psicología en
                Colombia.
            </p>

            <h2 style={h2}>8. Limitación de responsabilidad</h2>
            <p>
                El sitio se ofrece tal como está. No se garantiza que esté
                disponible sin interrupciones; si falla, se te contactará para
                reprogramar la cita.
            </p>

            <h2 style={h2}>9. Cambios y ley aplicable</h2>
            <p>
                Estas condiciones pueden actualizarse y la versión vigente estará
                siempre en esta página. Se rigen por las leyes de Colombia.
            </p>

            <h2 style={h2}>10. Contacto</h2>
            <p>aurapsicohumana@gmail.com</p>
        </DocumentoLegal>
    );
}
