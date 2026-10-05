import { useLocalSearchParams } from "expo-router";

import { ConsignmentDetailScreen } from "@/features/consignment/ConsignmentDetailScreen";

export default function ConsignmentDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ConsignmentDetailScreen consignmentId={id} />;
}
