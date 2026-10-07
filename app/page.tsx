import ScrollToTop from "./ScrollToTop";
import { formatearDuracion } from "./lib/duracion";

interface PublicacionBlog {
  id: number;
  titulo: string;
  resumen: string | null;
  contenido: string;
  imagen_url: string | null;
}

export default async function Home() {
  const [
    respuestaServicios,
    respuestaPerfil,
    respuestaTrayectoria,
    respuestaTestimonios,
    respuestaPublicaciones,
  ] = await Promise.all([
    fetch("http://localhost:3000/api/servicios", {
      cache: "no-store",
    }),
    fetch("http://localhost:3000/api/perfil", {
      cache: "no-store",
    }),
    fetch("http://localhost:3000/api/trayectoria", {
      cache: "no-store",
    }),
    fetch("http://localhost:3000/api/testimonios", {
      cache: "no-store",
    }),
    fetch("http://localhost:3000/api/publicaciones", {
      cache: "no-store",
    }),
  ]);

  const servicios = respuestaServicios.ok
    ? await respuestaServicios.json()
    : [];

  const perfil = respuestaPerfil.ok
    ? await respuestaPerfil.json()
    : null;

  const trayectoria = respuestaTrayectoria.ok
    ? await respuestaTrayectoria.json()
    : [];

  const testimonios = respuestaTestimonios.ok
    ? await respuestaTestimonios.json()
    : [];

  const publicaciones: PublicacionBlog[] = respuestaPublicaciones.ok
    ? await respuestaPublicaciones.json()
    : [];

  const nombreProfesional =
    perfil?.nombre_profesional || "Aura Elisa Sánchez";

  const profesion =
    perfil?.profesion || "Psicóloga Humanista";

  const whatsapp = perfil?.whatsapp || "";
  const correo = perfil?.correo || "";
  const direccion = perfil?.direccion || "";

  const whatsappLimpio = whatsapp.replace(/\D/g, "");
  const whatsappLink =
    whatsappLimpio.length === 10
      ? `57${whatsappLimpio}`
      : whatsappLimpio;

  const descripcion =
    perfil?.descripcion ||
    "Un espacio para acompañarte en tu bienestar emocional, crecimiento personal y desarrollo profesional.";

  const nombrePartes = nombreProfesional.trim().split(" ");

  const primerNombre = nombrePartes[0] || "Aura";

  const restoNombre =
    nombrePartes.slice(1).join(" ") || "Elisa Sánchez";

  // Aceptamos tanto URLs externas como rutas locales
  // generadas por el sistema de subida de imágenes.
  const fotoPerfil =
    perfil?.foto_url &&
    (perfil.foto_url.startsWith("http://") ||
      perfil.foto_url.startsWith("https://") ||
      perfil.foto_url.startsWith("/"))
      ? perfil.foto_url
      : "";

  const logoPerfil =
    perfil?.logo_url &&
    (perfil.logo_url.startsWith("http://") ||
      perfil.logo_url.startsWith("https://") ||
      perfil.logo_url.startsWith("/"))
      ? perfil.logo_url
      : "";

  return (
    <main className="min-h-screen overflow-hidden bg-[#F7F1E9] text-[#20231F]">
      <ScrollToTop />

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-[#E1DBD2] bg-[#FBF9F5]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 lg:px-8">

          {/* LOGO */}
          <a href="#inicio" className="flex min-w-0 items-center gap-3" aria-label={`Inicio: ${nombreProfesional}`}>
            {logoPerfil ? (
              <img src={logoPerfil} alt={`Logo ${nombreProfesional}`} className="h-12 w-12 shrink-0 rounded-full object-contain" />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#D8C8B5] bg-[#F0E5D8] font-serif text-xl text-[#59614D]">✦</span>
            )}
            <span className="min-w-0">
              <span className="block font-serif text-lg leading-5 text-[#20231F]">{nombreProfesional}</span>
              <span className="mt-1 block text-[9px] uppercase tracking-[0.16em] text-[#73756B]">{profesion}</span>
            </span>
          </a>

          {/* MENU */}
          <nav className="hidden items-center gap-7 md:flex">

            <a
              href="#inicio"
              className="text-sm hover:text-[#C56835]"
            >
              Inicio
            </a>

            <a
              href="#servicios"
              className="text-sm hover:text-[#C56835]"
            >
              Servicios
            </a>

            <a
              href="#sobre-mi"
              className="text-sm hover:text-[#C56835]"
            >
              Sobre mí
            </a>

            <a
              href="#testimonios"
              className="text-sm hover:text-[#C56835]"
            >
              Testimonios
            </a>
            <a
  href="/blog"
  className="text-sm hover:text-[#C56835]"
>
  Blog
</a>

            <a
              href="#contacto"
              className="text-sm hover:text-[#C56835]"
            >
              Contacto
            </a>

            <a
              href="/agendar"
              className="rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#AD542B]"
            >
              Agendar sesión
            </a>

          </nav>

        </div>
      </header>


      {/* HERO */}
      <section
        id="inicio"
        className="relative flex min-h-[650px] items-center bg-[#F7F1E9] px-6 py-14 md:py-20 lg:px-8 lg:py-12"
      >
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_0.95fr] lg:gap-14">

          {/* TEXTO PRINCIPAL */}
          <div className="relative z-10 py-4 lg:py-10">
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.34em] text-[#59614D]">
              Tu bienestar importa
            </p>

            <h1 className="max-w-2xl font-serif text-5xl leading-[1.02] tracking-[-0.045em] text-[#20231F] sm:text-6xl md:text-7xl">
              Un espacio seguro
              <br />
              <span className="relative inline-block italic text-[#B95B32]">para ti
                <span className="absolute -bottom-2 left-0 h-[3px] w-3/4 rounded-full bg-[#D6A477]" />
              </span>
            </h1>

            <p className="mt-8 max-w-lg text-base leading-7 text-[#62675B] md:text-lg md:leading-8">
              {descripcion}
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-[#59614D]">
              {profesion} · {nombreProfesional}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="/agendar" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#B95B32] px-7 py-3.5 text-sm font-semibold text-white shadow-md shadow-[#B95B32]/20 transition duration-300 hover:-translate-y-0.5 hover:bg-[#A94E29]">
                <span aria-hidden="true">▣</span> Agendar mi sesión
              </a>
              <a href="#sobre-mi" className="rounded-full border border-[#59614D]/60 px-7 py-3.5 text-center text-sm font-medium text-[#3F4635] transition hover:bg-[#59614D] hover:text-white">
                Conocer más
              </a>
            </div>

            <div className="mt-12 grid max-w-xl grid-cols-3 gap-3 border-t border-[#DED6CA] pt-6">
              <div className="flex items-start gap-2 text-xs leading-5 text-[#62675B]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F0E5D8] text-[#B95B32]">▣</span><span>Sesiones virtuales y presenciales</span></div>
              <div className="flex items-start gap-2 text-xs leading-5 text-[#62675B]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8E9DF] text-[#59614D]">♡</span><span>Enfoque humano e integral</span></div>
              <div className="flex items-start gap-2 text-xs leading-5 text-[#62675B]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F0E5D8] text-[#B95B32]">♧</span><span>Espacio seguro y confidencial</span></div>
            </div>
          </div>

          {/* FOTO PRINCIPAL */}
          {fotoPerfil && (
            <div className="relative mx-auto w-full max-w-[520px] lg:translate-y-2">

              <div className="absolute left-4 top-0 h-[88%] w-[88%] rounded-full bg-[#E6B991]" />

              <div className="relative mx-auto h-[390px] w-[90%] overflow-hidden rounded-t-full rounded-b-[42%] sm:h-[470px] lg:h-[510px]">

                <img
                  src={fotoPerfil}
                  alt={`Fotografía de ${nombreProfesional}`}
                  className="h-full w-full object-cover"
                />

              </div>

              <div className="absolute bottom-5 left-0 max-w-[280px] rounded-2xl border border-[#E1DBD2] bg-[#FBF9F5] px-5 py-4 text-[#20231F] shadow-xl sm:bottom-8 sm:-left-4 sm:px-6 sm:py-5">

                <h3 className="font-serif text-xl font-medium">
                  Encuentra tu centro
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#62675B]">
                  Un espacio para tu bienestar emocional y crecimiento personal.
                </p>

              </div>

            </div>
          )}

        </div>
      </section>


      {/* AREAS */}
      <section className="bg-[#FBF9F5] px-6 py-20 md:py-24">

        <div className="mx-auto max-w-7xl">

          <div className="mb-12 text-center">

            <p className="font-serif text-lg italic text-[#C56835]">
              Acompañamiento
            </p>

            <h2 className="mt-2 font-serif text-4xl text-[#3F4635]">
              Encuentra tu camino
            </h2>

          </div>


          <div className="grid gap-6 md:grid-cols-3">

            <div className="group rounded-[28px] border border-[#E1DBD2] bg-[#F7F1E9] p-8 text-center shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#59614D] text-2xl text-white">
                ♡
              </div>

              <h3 className="mt-6 font-serif text-2xl">
                Bienestar emocional
              </h3>

              <p className="mt-3 leading-7 text-[#707469]">
                Un espacio seguro para comprender y trabajar tus emociones.
              </p>

            </div>


            <div className="group rounded-[28px] border border-[#E1DBD2] bg-[#F7F1E9] p-8 text-center shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#C56835] text-2xl text-white">
                ♡
              </div>

              <h3 className="mt-6 font-serif text-2xl">
                Relaciones saludables
              </h3>

              <p className="mt-3 leading-7 text-[#707469]">
                Fortalece tus vínculos y construye relaciones más conscientes.
              </p>

            </div>


            <div className="group rounded-[28px] border border-[#E1DBD2] bg-[#F7F1E9] p-8 text-center shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#59614D] text-2xl text-white">
                ✦
              </div>

              <h3 className="mt-6 font-serif text-2xl">
                Desarrollo personal
              </h3>

              <p className="mt-3 leading-7 text-[#707469]">
                Potencia tus capacidades y avanza hacia tus objetivos.
              </p>

            </div>

          </div>

        </div>
      </section>


      {/* SERVICIOS */}
      <section
        id="servicios"
        className="relative bg-[#F7F1E9] px-6 py-24 md:py-28"
      >

        <div className="mx-auto max-w-7xl">

          {/* ENCABEZADO */}
          <div className="mx-auto max-w-2xl text-center">

            <p className="font-serif text-lg italic text-[#C56835]">
              Servicios
            </p>

            <h2 className="mt-3 font-serif text-4xl text-[#3F4635] md:text-5xl">
              Un acompañamiento pensado para ti
            </h2>

            <p className="mt-5 text-base leading-7 text-[#707469] md:text-lg">
              Espacios de acompañamiento profesional diseñados para
              cuidar tu bienestar emocional y favorecer tu crecimiento personal.
            </p>

          </div>


          {/* SERVICIOS DESDE MYSQL */}
          <div className="mt-14 grid gap-6 md:grid-cols-2">

            {servicios
              .filter((servicio: any) => servicio.activo)
              .map((servicio: any) => (

                <div
                  key={servicio.id}
                  className="group rounded-2xl border border-[#E7E0D7] bg-[#FBF9F5] p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg md:p-7"
                >

                  <h3 className="font-serif text-2xl text-[#3F4635]">
                    {servicio.nombre}
                  </h3>

                  <p className="mt-3 text-[#707469]">
                    {servicio.descripcion}
                  </p>

                  {servicio.tipo_servicio === "ESPECIAL" ? (
                      <div className="mt-5 flex flex-col items-start gap-4">
                      <span className="text-sm font-medium text-[#707469]">
                        Atención personalizada · Cotización previa
                      </span>

                      {whatsappLink ? (
                        <a
                          href={`https://wa.me/${whatsappLink}?text=${encodeURIComponent(`Hola, quisiera cotizar el servicio ${servicio.nombre}.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-fit items-center gap-2 rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#B5572A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C56835]"
                        >
                          Cotizar por WhatsApp
                        </a>
                      ) : (
                        <p className="text-sm text-[#A94F24]">
                          WhatsApp no está configurado actualmente.
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="mt-5 flex flex-wrap gap-3 text-sm text-[#707469]">
                        <span>
                          ⏱️ {formatearDuracion(servicio.duracion_minutos)}
                        </span>

                        <span>
                          💰 ${Number(servicio.precio).toLocaleString("es-CO")}
                        </span>

                        <span>
                          {servicio.modalidad === "VIRTUAL"
                            ? "💻 Virtual"
                            : servicio.modalidad === "PRESENCIAL"
                              ? "🏢 Presencial"
                              : "🏢💻 Presencial y Virtual"}
                        </span>
                      </div>

                      <a
                        href="/agendar"
                        className="mt-6 inline-block rounded-full bg-[#C56835] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#B5572A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C56835]"
                      >
                        Agendar sesión
                      </a>
                    </>
                  )}

                </div>

              ))}

          </div>

        </div>

      </section>


      {/* SOBRE MI */}
      <section id="sobre-mi" className="relative overflow-hidden bg-[#E9E9DF] px-6 py-24 text-[#30372B] md:py-28">
        <style>{`
          .diploma-modal { opacity: 0; pointer-events: none; transition: opacity 220ms ease; }
          .diploma-modal:target { opacity: 1; pointer-events: auto; }
        `}</style>

        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="font-serif text-lg italic text-[#B95B32]">Sobre mí</p>
            <h2 className="mt-3 font-serif text-4xl text-[#30372B] md:text-5xl">Formación y trayectoria</h2>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-[#62675B] md:text-lg md:leading-8">
              Mi formación y experiencia respaldan el acompañamiento profesional. Aquí puedes conocer mis estudios, cursos, diplomados y certificaciones.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {trayectoria.map((elemento: any) => {
              const imagenValida = elemento.imagen_url && (String(elemento.imagen_url).startsWith("http://") || String(elemento.imagen_url).startsWith("https://") || String(elemento.imagen_url).startsWith("/"));
              const tipo = elemento.tipo === "TITULO" ? "Título" : elemento.tipo === "CURSO" ? "Curso" : elemento.tipo === "DIPLOMADO" ? "Diplomado" : "Certificación";
              const modalId = `diploma-${elemento.id}`;

              return (
                <article key={elemento.id} className="overflow-hidden rounded-[24px] border border-[#D6D8CC] bg-[#F7F6F0] text-left transition duration-300 hover:-translate-y-1 hover:bg-white">
                  <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
                    {imagenValida ? (
                      <a href={`#${modalId}`} className="group relative block shrink-0 overflow-hidden rounded-2xl border border-[#D6D8CC] bg-[#F7F1E9] sm:h-32 sm:w-24" aria-label={`Ver ${tipo}: ${elemento.titulo}`}>
                        <img src={String(elemento.imagen_url)} alt={`Imagen de ${tipo}: ${elemento.titulo}`} className="h-48 w-full object-cover transition duration-300 group-hover:scale-105 sm:h-full" />
                        <span className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#3F4635]/90 text-white shadow-lg">↗</span>
                      </a>
                    ) : (
                      <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-2xl border border-[#D6D8CC] bg-white text-2xl text-[#A6AA9A]">✦</div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#B95B32]">{tipo}</p>
                      <h3 className="mt-2 font-serif text-xl leading-7">{elemento.titulo}</h3>
                      {elemento.institucion && <p className="mt-1 text-sm text-[#707469]">{elemento.institucion}</p>}
                      {elemento.descripcion && <p className="mt-3 text-sm leading-6 text-[#62675B]">{elemento.descripcion}</p>}
                      {(elemento.fecha_inicio || elemento.fecha_fin) && (
                        <p className="mt-3 text-xs text-[#85877D]">
                          {elemento.fecha_inicio ? new Date(elemento.fecha_inicio).toLocaleDateString("es-CO", { month: "long", year: "numeric" }) : "Sin fecha"}
                          {" — "}
                          {elemento.fecha_fin ? new Date(elemento.fecha_fin).toLocaleDateString("es-CO", { month: "long", year: "numeric" }) : "Actualidad"}
                        </p>
                      )}
                      {imagenValida && <a href={`#${modalId}`} className="mt-4 inline-block text-sm font-medium text-[#B95B32] hover:text-[#59614D]">Ver diploma</a>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {trayectoria.length === 0 && (
            <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-dashed border-[#C8CBBE] p-8 text-center text-[#707469]">
              Próximamente encontrarás aquí la formación y trayectoria profesional.
            </div>
          )}

          <div className="mt-12 border-t border-[#D6D8CC] pt-8 text-center">
            <p className="font-serif text-lg italic text-[#62675B]">La formación constante permite ofrecer un acompañamiento más humano y profesional.</p>
          </div>

          {trayectoria.map((elemento: any) => {
            const imagenValida = elemento.imagen_url && (String(elemento.imagen_url).startsWith("http://") || String(elemento.imagen_url).startsWith("https://") || String(elemento.imagen_url).startsWith("/"));
            if (!imagenValida) return null;
            const modalId = `diploma-${elemento.id}`;
            return (
              <div key={modalId} id={modalId} className="diploma-modal fixed inset-0 z-[100] flex items-center justify-center bg-[#1F241B]/80 p-4 backdrop-blur-sm">
                <a href="#sobre-mi" aria-label="Cerrar diploma" className="absolute inset-0 cursor-default" />
                <div className="relative z-10 max-h-[92vh] max-w-4xl overflow-hidden rounded-3xl bg-[#F7F1E9] p-3 shadow-2xl sm:p-5">
                  <a href="#sobre-mi" className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-[#3F4635]/90 text-xl text-white shadow-lg" aria-label="Cerrar">×</a>
                  <img src={String(elemento.imagen_url)} alt={`Diploma ampliado: ${elemento.titulo}`} className="max-h-[82vh] w-auto max-w-full rounded-2xl object-contain" />
                  <div className="px-2 pb-1 pt-4 text-center text-[#3F4635]">
                    <p className="font-serif text-lg">{elemento.titulo}</p>
                    {elemento.institucion && <p className="mt-1 text-sm text-[#707469]">{elemento.institucion}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>


      {/* =====================================================
          TESTIMONIOS
          ===================================================== */}
      <section
        id="testimonios"
        className="bg-[#F7F6F1] px-6 py-20 md:py-24"
      >

        <div className="mx-auto max-w-7xl">

          {/* ENCABEZADO */}
          <div className="mx-auto max-w-2xl text-center">

            <p className="font-serif text-lg italic text-[#C56835]">
              Testimonios
            </p>

            <h2 className="mt-3 font-serif text-4xl text-[#3F4635] md:text-5xl">
              Lo que dicen quienes han vivido el proceso
            </h2>

            <p className="mt-5 text-base leading-7 text-[#707469] md:text-lg">
              Cada proceso es único. Estas son algunas experiencias
              compartidas por personas que han encontrado un espacio
              de acompañamiento y bienestar.
            </p>

          </div>


          {/* TESTIMONIOS */}
          {testimonios.length > 0 ? (

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">

              {testimonios.map((testimonio: any) => (

                <article
                  key={testimonio.id}
                  className="relative rounded-2xl border border-[#E7E0D7] bg-[#FBF9F5] p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                >

                  {/* COMILLAS */}
                  <div className="absolute right-6 top-5 font-serif text-6xl leading-none text-[#C56835]/20">
                    ”
                  </div>


                  {/* ESTRELLAS */}
                  <div className="flex gap-1 text-[#C56835]">
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                  </div>


                  {/* COMENTARIO */}
                  <p className="relative mt-5 text-base leading-7 text-[#62675B]">
                    “{testimonio.comentario}”
                  </p>


                  {/* NOMBRE */}
                  <div className="mt-7 border-t border-[#D8D0C5] pt-5">

                    <p className="font-serif text-lg text-[#3F4635]">
                      {testimonio.nombre}
                    </p>

                    <p className="mt-1 text-xs uppercase tracking-[0.15em] text-[#C56835]">
                      Experiencia compartida
                    </p>

                  </div>

                </article>

              ))}

            </div>

          ) : (

            <div className="mx-auto mt-12 max-w-2xl rounded-3xl border border-dashed border-[#D8D0C5] bg-[#F7F1E9] p-8 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#59614D] text-xl text-white">
                ★
              </div>

              <h3 className="mt-4 font-serif text-2xl">
                Próximamente
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#707469]">
                Muy pronto encontrarás aquí experiencias
                compartidas por quienes han realizado su proceso.
              </p>

            </div>

          )}

        </div>

      </section>


      {/* AGENDA */}
      <section className="bg-[#F7F1E9] px-6 py-20 md:py-24">

        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-[#59614D] px-8 py-16 text-center text-white shadow-xl md:px-16 md:py-20">

          <p className="font-serif text-lg italic text-white/80">
            Da el primer paso
          </p>

          <h2 className="mt-3 font-serif text-4xl md:text-5xl">
            Agenda tu sesión
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/80">
            Elige la modalidad, fecha y hora que mejor se adapte a ti.
          </p>

          <a
            href="/agendar"
            className="mt-8 inline-block rounded-full bg-white px-8 py-4 font-medium text-[#C56835] transition hover:bg-[#F7F1E9]"
          >
            Agendar ahora
          </a>

        </div>

      </section>


      {publicaciones.length > 0 && (
        <section className="bg-[#FBF9F5] px-6 py-20 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#B95B32]">Blog</p>
                <h2 className="mt-3 font-serif text-4xl text-[#20231F] md:text-5xl">Artículos para tu bienestar</h2>
              </div>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {publicaciones.slice(0, 3).map((publicacion) => (
                <a key={publicacion.id} href={`/blog/${publicacion.id}`} className="group overflow-hidden rounded-2xl border border-[#E7E0D7] bg-white transition hover:-translate-y-1 hover:shadow-lg">
                  {publicacion.imagen_url ? (
                    <img src={publicacion.imagen_url} alt={publicacion.titulo} className="h-36 w-full object-cover" />
                  ) : (
                    <div className="flex h-36 items-end bg-gradient-to-br from-[#E7D4C1] via-[#F1E9DE] to-[#D9DED0] p-5">
                      <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#59614D]">Artículo</span>
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="font-serif text-xl text-[#20231F]">{publicacion.titulo}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#707469]">
                      {publicacion.resumen || publicacion.contenido.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180)}
                    </p>
                    <span className="mt-4 inline-block text-sm font-medium text-[#B95B32]">Leer más →</span>
                  </div>
                </a>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <a
                href="/blog"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#C56835] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#AD542B]"
              >
                Explorar el blog <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer
        id="contacto"
        className="bg-[#30372B] px-6 py-14 text-white md:py-16"
      >
        <div className="mx-auto max-w-7xl">

          <div className="grid gap-10 lg:grid-cols-[1fr_1.25fr_0.9fr] lg:gap-14">

            {/* MARCA */}
            <div>
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[#E1DBD2]/30 text-2xl text-[#E8A67F]">
                ✦
              </div>

              <h3 className="font-serif text-3xl leading-tight">
                {nombreProfesional}
              </h3>

              <p className="mt-2 text-sm uppercase tracking-[0.16em] text-white/55">
                {profesion}
              </p>

              <div className="mt-5 h-px w-10 bg-[#E8A67F]" />

              <p className="mt-5 max-w-sm text-sm leading-6 text-white/65">
                {descripcion}
              </p>
            </div>


            {/* CONTACTO */}
            <div>
              <h4 className="font-serif text-2xl">
                Contacto
              </h4>

              <div className="mt-5 space-y-3">

                {/* WHATSAPP */}
                {whatsapp ? (
                  <a
                    href={`https://wa.me/${whatsappLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.10]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#59614D] text-xl text-white">
                      <svg
                        viewBox="0 0 32 32"
                        className="h-6 w-6 fill-current"
                        aria-hidden="true"
                      >
                        <path d="M16 3C8.82 3 3 8.82 3 16c0 2.29.59 4.45 1.7 6.36L3.1 29l6.82-1.56A12.94 12.94 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3Zm0 23.65c-2.04 0-4.04-.55-5.78-1.59l-.41-.24-4.05.93.95-3.94-.27-.41A10.61 10.61 0 1 1 16 26.65Zm5.83-7.95c-.32-.16-1.9-.94-2.2-1.05-.3-.11-.52-.16-.74.16-.22.33-.85 1.05-1.04 1.27-.19.22-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.59-.96-.86-1.61-1.91-1.8-2.23-.19-.33-.02-.5.14-.66.14-.14.32-.38.49-.57.16-.19.22-.33.33-.55.11-.22.05-.41-.03-.57-.08-.16-.74-1.78-1.01-2.44-.27-.65-.54-.56-.74-.57h-.63c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.71s1.17 3.14 1.33 3.36c.16.22 2.3 3.51 5.57 4.92.78.34 1.39.54 1.87.69.79.25 1.51.21 2.08.13.63-.09 1.9-.78 2.17-1.54.27-.76.27-1.41.19-1.54-.08-.14-.3-.22-.63-.38Z" />
                      </svg>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        WhatsApp
                      </span>
                      <span className="mt-1 block truncate text-sm text-white/60">
                        {whatsapp}
                      </span>
                    </span>

                    <span className="text-xl text-white/45 transition group-hover:translate-x-1 group-hover:text-white">
                      ›
                    </span>
                  </a>
                ) : (
                  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#59614D] text-xl">
                      ✆
                    </span>
                    <span className="text-sm text-white/60">
                      WhatsApp no configurado
                    </span>
                  </div>
                )}


                {/* CORREO */}
                {correo ? (
                  <a
                    href={`mailto:${correo}`}
                    className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.10]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#59614D] text-xl">
                      ✉
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        Correo electrónico
                      </span>
                      <span className="mt-1 block truncate text-sm text-white/60">
                        {correo}
                      </span>
                    </span>

                    <span className="text-xl text-white/45 transition group-hover:translate-x-1 group-hover:text-white">
                      ›
                    </span>
                  </a>
                ) : (
                  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#59614D] text-xl">
                      ✉
                    </span>
                    <span className="text-sm text-white/60">
                      Correo no configurado
                    </span>
                  </div>
                )}


                {/* DIRECCIÓN / GOOGLE MAPS */}
                {direccion ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-2xl border border-[#E1DBD2] bg-[#F7F1E9] px-4 py-4 text-[#3F4635] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#C56835] text-xl text-white">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-6 w-6 fill-current"
                        aria-hidden="true"
                      >
                        <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
                      </svg>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        Dirección
                      </span>
                      <span className="mt-1 block text-sm text-[#707469]">
                        {direccion}
                      </span>
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="hidden text-sm font-medium sm:block">
                        Ver en Google Maps
                      </span>
                      <span className="mt-1 hidden text-lg text-[#C56835] sm:block">
                        ↗
                      </span>
                    </span>
                  </a>
                ) : (
                  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#C56835] text-xl">
                      📍
                    </span>
                    <span className="text-sm text-white/60">
                      Dirección no configurada
                    </span>
                  </div>
                )}

              </div>
            </div>


            {/* ATENCIÓN */}
            <div>
              <h4 className="font-serif text-2xl">
                Atención
              </h4>

              <div className="mt-5 space-y-5">

                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-xl">
                    ♡
                  </span>

                  <div>
                    <p className="text-sm font-medium">
                      Consultas presenciales
                    </p>
                    <p className="mt-1 text-sm text-white/55">
                      y virtuales
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-xl">
                    ◷
                  </span>

                  <div>
                    <p className="text-sm font-medium">
                      Atención profesional
                    </p>
                    <p className="mt-1 text-sm leading-6 text-white/55">
                      Un espacio pensado para tu bienestar emocional.
                    </p>
                  </div>
                </div>

              </div>

              <div className="mt-7 border-t border-white/10 pt-6">
                <p className="font-serif text-lg italic leading-7 text-white/65">
                  “Cuidar de tu salud mental también es avanzar.”
                </p>
              </div>
            </div>

          </div>


          {/* PIE */}
          <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-white/40 md:flex md:items-center md:justify-between md:text-left">
            <p>
              © 2026 {nombreProfesional}. Todos los derechos reservados.
            </p>

            <p className="mt-3 md:mt-0">
              Atención presencial y virtual
            </p>
          </div>

        </div>
      </footer>

      {/* WHATSAPP FLOTANTE */}
      {whatsappLink && (
        <a
          href={`https://wa.me/${whatsappLink}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
          className="fixed bottom-5 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition duration-300 hover:scale-110 hover:shadow-2xl sm:bottom-6 sm:right-6"
        >
          <svg
            viewBox="0 0 32 32"
            className="h-8 w-8 fill-current"
            aria-hidden="true"
          >
            <path d="M16 3C8.82 3 3 8.82 3 16c0 2.29.59 4.45 1.7 6.36L3.1 29l6.82-1.56A12.94 12.94 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3Zm0 23.65c-2.04 0-4.04-.55-5.78-1.59l-.41-.24-4.05.93.95-3.94-.27-.41A10.61 10.61 0 1 1 16 26.65Zm5.83-7.95c-.32-.16-1.9-.94-2.2-1.05-.3-.11-.52-.16-.74.16-.22.33-.85 1.05-1.04 1.27-.19.22-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.59-.96-.86-1.61-1.91-1.8-2.23-.19-.33-.02-.5.14-.66.14-.14.32-.38.49-.57.16-.19.22-.33.33-.55.11-.22.05-.41-.03-.57-.08-.16-.74-1.78-1.01-2.44-.27-.65-.54-.56-.74-.57h-.63c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.71s1.17 3.14 1.33 3.36c.16.22 2.3 3.51 5.57 4.92.78.34 1.39.54 1.87.69.79.25 1.51.21 2.08.13.63-.09 1.9-.78 2.17-1.54.27-.76.27-1.41.19-1.54-.08-.14-.3-.22-.63-.38Z" />
          </svg>
        </a>
      )}

    </main>
  );
}