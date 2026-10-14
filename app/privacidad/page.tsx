import type { Metadata } from "next";
import DocumentoLegal from "../components/DocumentoLegal";

export const metadata: Metadata = {
  title: "Política de privacidad | Aura Elisa Sánchez",
  description:
    "Cómo se tratan los datos personales de quienes agendan una cita.",
};

const h2 = { fontSize: "1.3rem", margin: "2rem 0 0.5rem" } as const;

export default function Privacidad() {
  return (
    <DocumentoLegal
      titulo="Política de privacidad y tratamiento de datos personales"
      actualizado="13 de octubre de 2026"
    >
      <p>
        Esta política explica qué datos personales recoge el sitio
        aurapsicohumana.com, para qué los usa y cómo puedes ejercer tus
        derechos. Se emite en cumplimiento de la Ley 1581 de 2012 y sus
        decretos reglamentarios.
      </p>

      <h2 style={h2}>1. Responsable del tratamiento</h2>
      <p>
        Aura Elisa Sánchez, psicóloga. Correo de contacto:
        aurapsicohumana@gmail.com . Ciudad: Medellín, Colombia.
      </p>

      <h2 style={h2}>2. Datos que se recogen</h2>
      <p>Al agendar una cita se recogen únicamente:</p>
      <ul>
        <li>Nombre.</li>
        <li>Correo electrónico.</li>
        <li>Número de teléfono de contacto.</li>
        <li>
          Datos de la cita: servicio elegido, fecha, hora y modalidad
          (presencial o virtual).
        </li>
      </ul>
      <p>
        Por tratarse de servicios de psicología, el solo hecho de que una
        persona agende una cita puede relacionarse con su salud. Por eso
        estos datos se tratan con reserva y solo para los fines descritos
        aquí. Este sitio no pide diagnósticos ni historias clínicas.
      </p>

      <h2 style={h2}>3. Para qué se usan</h2>
      <ul>
        <li>Agendar, confirmar, reprogramar y cancelar citas.</li>
        <li>Enviar confirmaciones y recordatorios por correo.</li>
        <li>
          Crear el evento en el calendario de la profesional y, en las
          citas virtuales, generar el enlace de videollamada.
        </li>
        <li>Procesar el pago de la cita.</li>
        <li>Contactarte si hay un cambio o un problema con tu cita.</li>
      </ul>
      <p>No se usan para publicidad ni se venden a terceros.</p>

      <h2 style={h2}>4. Google Calendar y Google Meet</h2>
      <p>
        La profesional conecta su cuenta de Google al sitio para que, al
        confirmarse una cita, se cree automáticamente un evento en su
        Google Calendar y, si la cita es virtual, un enlace de Google Meet.
        El evento puede incluir tu nombre, tu correo, el servicio y la
        modalidad de la cita. El sitio no lee otros eventos ni comparte la
        información del calendario con terceros.
      </p>
      <p>
        El uso y la transferencia a cualquier otra aplicación de la
        información recibida de las APIs de Google cumplirá con la
        Política de datos de usuario de los servicios de API de Google,
        incluidos los requisitos de uso limitado.
      </p>

      <h2 style={h2}>5. Con quién se comparten los datos</h2>
      <p>
        Solo con los proveedores necesarios para prestar el servicio, que
        actúan como encargados del tratamiento:
      </p>
      <ul>
        <li>Wompi, para procesar pagos.</li>
        <li>Resend, para enviar correos de confirmación y recordatorio.</li>
        <li>Google, para Calendar y Meet.</li>
        <li>Hostinger, que aloja el sitio y la base de datos.</li>
      </ul>
      <p>
        Estos proveedores pueden estar ubicados fuera de Colombia. Fuera de
        ellos, los datos solo se entregan si una autoridad competente lo
        exige.
      </p>

      <h2 style={h2}>6. Seguridad</h2>
      <p>
        Los datos se almacenan en una base de datos con acceso restringido y
        las credenciales de conexión con Google se guardan cifradas. Ningún
        sistema es completamente invulnerable, pero se aplican medidas
        razonables para evitar accesos no autorizados.
      </p>

      <h2 style={h2}>7. Cuánto tiempo se conservan</h2>
      <p>
        Los datos se conservan mientras sean necesarios para prestar el
        servicio y cumplir obligaciones legales.
      </p>

      <h2 style={h2}>8. Tus derechos</h2>
      <p>Como titular de los datos puedes:</p>
      <ul>
        <li>Conocer, actualizar y rectificar tus datos.</li>
        <li>Pedir prueba de la autorización que diste.</li>
        <li>Saber cómo se han usado tus datos.</li>
        <li>Pedir la supresión de tus datos o revocar la autorización.</li>
        <li>
          Presentar quejas ante la Superintendencia de Industria y Comercio.
        </li>
      </ul>
      <p>
        Para ejercerlos, escribe a aurapsicohumana@gmail.com indicando tu nombre
        y el correo con el que agendaste. Se responderá dentro de los
        plazos que fija la ley.
      </p>

      <h2 style={h2}>9. Autorización</h2>
      <p>
        Al marcar la casilla de aceptación al agendar una cita, autorizas
        de forma previa, expresa e informada el tratamiento de tus datos
        según esta política.
      </p>

      <h2 style={h2}>10. Cambios</h2>
      <p>
        Esta política puede actualizarse. La versión vigente siempre estará
        en esta página, con su fecha de actualización.
      </p>
    </DocumentoLegal>
  );
}
