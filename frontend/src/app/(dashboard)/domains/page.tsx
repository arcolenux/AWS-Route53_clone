import ComingSoon from "@/components/ComingSoon";
export default function DomainsPage() {
  return (
    <ComingSoon
      title="Domains"
      icon="◻"
      description="Register new domain names or transfer existing ones to Route 53. Manage domain settings, contacts, and auto-renewal."
      docsUrl="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/registrar.html"
    />
  );
}
