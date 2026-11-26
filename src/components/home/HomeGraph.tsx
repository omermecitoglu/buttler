import { getTranslations } from "next-intl/server";
import EmptyServicesState from "~/components/EmptyServicesState";
import ServiceGraph from "~/components/home/ServiceGraph";
import { getServiceGraph } from "~/data/services";

const HomeGraph = async () => {
  const [
    graph,
    t,
    tDashboard,
  ] = await Promise.all([
    getServiceGraph(),
    getTranslations("HomePage"),
    getTranslations("DashboardPage"),
  ]);

  if (graph.nodes.length === 0) {
    return (
      <EmptyServicesState
        title={tDashboard("emptyState.title")}
        description={tDashboard("emptyState.description")}
        actionLabel={tDashboard("emptyState.action")}
      />
    );
  }

  return <ServiceGraph graph={graph} label={t("graph")} />;
};

export default HomeGraph;
