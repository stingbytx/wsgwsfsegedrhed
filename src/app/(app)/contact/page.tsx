"use client";
import { useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

const WHATSAPP_NUMBER = "94701282176";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error("Please fill in all fields");
      return;
    }

    const text =
      `*New Contact Form Message — UniPOS*\n\n` +
      `*Name:* ${formData.name}\n` +
      `*Email:* ${formData.email}\n` +
      `*Subject:* ${formData.subject}\n\n` +
      `*Message:*\n${formData.message}`;

    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");

    toast.success("Opening WhatsApp to send your message!");
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="space-y-8 p-8 max-w-4xl">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Contact Us</h1>
        <p className="text-lg text-slate-600">
          Have questions or need support? Get in touch with our team.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-slate-50 rounded-lg p-6 flex flex-col items-center text-center">
          <Mail className="h-8 w-8 text-[#0070E0] mb-3" />
          <h3 className="font-semibold text-slate-900 mb-2">Email</h3>
          <p className="text-slate-600 text-sm">support@unipos.web.lk</p>
        </div>

        <div className="bg-slate-50 rounded-lg p-6 flex flex-col items-center text-center">
          <Phone className="h-8 w-8 text-[#0070E0] mb-3" />
          <h3 className="font-semibold text-slate-900 mb-2">Phone</h3>
          <p className="text-slate-600 text-sm">+94 70 128 2176</p>
        </div>

        <div className="bg-slate-50 rounded-lg p-6 flex flex-col items-center text-center">
          <MapPin className="h-8 w-8 text-[#0070E0] mb-3" />
          <h3 className="font-semibold text-slate-900 mb-2">Location</h3>
          <p className="text-slate-600 text-sm">Colombo, Sri Lanka</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-50 rounded-lg p-8 space-y-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">Send us a Message</h2>

        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
            Your Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-[#0070E0] focus:ring-2 focus:ring-[#0070E0]/20 outline-none transition-all"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-[#0070E0] focus:ring-2 focus:ring-[#0070E0]/20 outline-none transition-all"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-semibold text-slate-700 mb-2">
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            value={formData.subject}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-[#0070E0] focus:ring-2 focus:ring-[#0070E0]/20 outline-none transition-all"
            placeholder="How can we help?"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-2">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={5}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-[#0070E0] focus:ring-2 focus:ring-[#0070E0]/20 outline-none transition-all resize-none"
            placeholder="Tell us more about your inquiry..."
          />
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-b from-[#0070E0] to-[#0052CC] text-white font-semibold py-3 rounded-lg hover:from-[#0060cc] hover:to-[#004ab3] transition-all flex items-center justify-center gap-2"
        >
          {/* WhatsApp icon */}
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Send via WhatsApp
        </button>
      </form>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-slate-900 mb-2">Business Hours</h3>
        <p className="text-slate-600 text-sm">
          Monday - Friday: 9:00 AM - 6:00 PM (Sri Lanka Time)<br />
          Saturday &amp; Sunday: Closed
        </p>
      </div>
    </div>
  );
}
