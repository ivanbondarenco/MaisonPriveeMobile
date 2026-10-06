import { useLocalSearchParams } from "expo-router";

import { MembershipCheckoutScreen } from "@/features/membership/MembershipCheckoutScreen";

export default function MembershipSubscribeRoute() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  return <MembershipCheckoutScreen planId={planId} />;
}
