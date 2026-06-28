export default function Toast({ message }) {
  if (!message) return null
  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-[13px] font-semibold text-white shadow-lg z-50 whitespace-nowrap pointer-events-none"
      style={{ backgroundColor: '#374151' }}
    >
      {message}
    </div>
  )
}
