import ComingSoon from "@/components/ComingSoon";
export default function TrafficPoliciesPage() {
  return (
    <ComingSoon
      title="Traffic policies"
      icon="⬡"
      description="Create traffic policies to route traffic based on latency, geolocation, geoproximity, and other factors. Use traffic flow to simplify complex routing configurations."
      docsUrl="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/traffic-flow.html"
    />
  );
}
