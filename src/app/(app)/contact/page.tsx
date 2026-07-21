"use client";
import { useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

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
    toast.success("Thank you for your message! We'll get back to you soon.");
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
          <p className="text-slate-600 text-sm">support@unipos.lk</p>
        </div>

        <div className="bg-slate-50 rounded-lg p-6 flex flex-col items-center text-center">
          <Phone className="h-8 w-8 text-[#0070E0] mb-3" />
          <h3 className="font-semibold text-slate-900 mb-2">Phone</h3>
          <p className="text-slate-600 text-sm">+94 (0) 123 456 789</p>
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
          className="w-full bg-gradient-to-b from-[#0070E0] to-[#0052CC] text-white font-semibold py-3 rounded-lg hover:from-[#0060cc] hover:to-[#004ab3] transition-all"
        >
          Send Message
        </button>
      </form>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-slate-900 mb-2">Business Hours</h3>
        <p className="text-slate-600 text-sm">
          Monday - Friday: 9:00 AM - 6:00 PM (Sri Lanka Time)<br />
          Saturday & Sunday: Closed
        </p>
      </div>
    </div>
  );
}
