import { MarketingPageShell } from "@/components/marketing/page-shell";

export default function ContactPage() {
  return (
    <MarketingPageShell title="Contact Us">
      <p>Thank you for choosing UniPOS.</p>
      <p>
        If you have any questions, require technical support, or would like to learn more about our services, our
        team is here to help.
      </p>

      <h2>General Inquiries</h2>
      <p>
        <strong>Company:</strong> UniPOS (A Subsidiary of DotcomOne)
        <br />
        <strong>Email:</strong> <a href="mailto:support@unipos.lk">support@unipos.lk</a>
        <br />
        <strong>Business Hours:</strong> Monday – Friday: 9:00 AM – 6:00 PM (Sri Lanka Time)
      </p>

      <h2>Technical Support</h2>
      <p>
        If you experience any issues with your account or the UniPOS platform, please contact our support team with a
        detailed description of the issue. We aim to respond to all support requests as quickly as possible.
      </p>

      <h2>Business Partnerships</h2>
      <p>
        For partnership opportunities, reseller inquiries, or enterprise solutions, please contact our business
        development team.
      </p>

      <p>We appreciate your trust in UniPOS and are committed to providing reliable service and exceptional customer support.</p>
    </MarketingPageShell>
  );
}
