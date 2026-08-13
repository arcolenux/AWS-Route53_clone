import ComingSoon from "@/components/ComingSoon";
export default function HealthChecksPage() {
  return (
    <ComingSoon
      title="Health checks"
      icon="♥"
      description="Monitor the health of your resources and receive notifications when they become unhealthy. Route 53 can also route traffic away from unhealthy resources."
      docsUrl="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/welcome-health-checks.html"
    />
  );
}
