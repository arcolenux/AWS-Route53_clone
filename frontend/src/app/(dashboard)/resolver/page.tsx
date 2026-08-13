import ComingSoon from "@/components/ComingSoon";
export default function ResolverPage() {
  return (
    <ComingSoon
      title="Resolver"
      icon="⟳"
      description="Route DNS queries between your VPCs and your on-premises networks. Use Resolver endpoints, rules, and query logging."
      docsUrl="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html"
    />
  );
}
