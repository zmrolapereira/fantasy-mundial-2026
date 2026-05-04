"use client";

export default function WhatsAppFloatingButton() {
  const whatsappGroupLink = "https://chat.whatsapp.com/BvpEfhFjAJi3FiXozlMDRx";

  return (
    <a
      href={whatsappGroupLink}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-black text-white shadow-lg transition hover:scale-105 hover:bg-[#1ebe5d]"
    >
      <span className="text-lg">💬</span>
      <span className="hidden sm:inline">Grupo WhatsApp</span>
    </a>
  );
}