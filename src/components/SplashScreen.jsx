const splashPhoto = import.meta.env.BASE_URL + 'images/splash.png'

export default function SplashScreen({ visible }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sky-400 transition-opacity duration-500"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      {/* Hebrew title */}
      <h2
        dir="rtl"
        className="text-2xl font-bold text-white select-none drop-shadow mb-5"
      >
        הזצ&quot;מים ביפן 2026
      </h2>

      {/* Photo */}
      <div className="w-48 h-48 rounded-full overflow-hidden shadow-2xl mb-6">
        <img
          src={splashPhoto}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Text */}
      <h1 className="text-3xl font-bold text-white select-none drop-shadow">
        Welcome :-)
      </h1>
    </div>
  )
}
