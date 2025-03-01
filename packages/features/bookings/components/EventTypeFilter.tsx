import { useSession } from "next-auth/react";
import { Fragment, useMemo, useState } from "react";

import {
  FilterCheckboxField,
  FilterCheckboxFieldsContainer,
} from "@calcom/features/filters/components/TeamsFilter";
import type { IEventTypeFilter } from "@calcom/features/filters/types/filter";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { FilterSearchField } from "@calcom/ui";
import { AnimatedPopover, Divider, Icon } from "@calcom/ui";

import { groupBy } from "../groupBy";
import { useFilterQuery } from "../lib/useFilterQuery";

type GroupedEventTypeState = Record<
  string,
  {
    team: {
      id: number;
      name: string;
    } | null;
    id: number;
    title: string;
    slug: string;
  }[]
>;

export const EventTypeFilter = () => {
  const { t } = useLocale();
  const { data: user } = useSession();
  const { data: query, pushItemToKey, removeItemByKeyAndValue, removeAllQueryParams } = useFilterQuery();
  const [search, setSearch] = useState("");

  const eventTypes = trpc.viewer.eventTypes.listWithTeam.useQuery(undefined, {
    enabled: !!user,
  });
  const groupedEventTypes: GroupedEventTypeState | null = useMemo(() => {
    const data = eventTypes.data;
    if (!data) {
      return null;
    }
    // Will be handled up the tree to redirect
    // Group event types by team
    const grouped = groupBy<IEventTypeFilter>(
      data.filter((el) => el.team),
      (item) => item?.team?.name || ""
    ); // Add the team name
    const individualEvents = data.filter((el) => !el.team);
    // push individual events to the start of grouped array
    return individualEvents.length > 0 ? { user_own_event_types: individualEvents, ...grouped } : grouped;
  }, [eventTypes.data]);

  if (!eventTypes.data) return null;
  const isEmpty = eventTypes.data.length === 0;

  const getTextForPopover = () => {
    const eventTypeIds = query.eventTypeIds;
    if (eventTypeIds) {
      return `${t("number_selected", { count: eventTypeIds.length })}`;
    }
    return `${t("all")}`;
  };

  return (
    <AnimatedPopover text={getTextForPopover()} prefix={`${t("event_type")}: `}>
      {!isEmpty ? (
        <FilterCheckboxFieldsContainer>
          <FilterSearchField
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <FilterCheckboxField
            id="all"
            icon={<Icon name="link" className="h-4 w-4" />}
            checked={!query.eventTypeIds?.length}
            onChange={removeAllQueryParams}
            label={t("all_event_types_filter_label")}
          />
          <Divider />
          {groupedEventTypes &&
            Object.keys(groupedEventTypes).map((teamName) => (
              <Fragment key={teamName}>
                <div className="text-subtle px-4 py-2 text-xs font-medium uppercase leading-none">
                  {teamName === "user_own_event_types" ? t("individual") : teamName}
                </div>
                {groupedEventTypes[teamName]
                  .filter((eventType) => eventType.title.toLowerCase().includes(search.toLowerCase()))
                  .map((eventType) => (
                    <FilterCheckboxField
                      key={eventType.id}
                      checked={query.eventTypeIds?.includes(eventType.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          pushItemToKey("eventTypeIds", eventType.id);
                        } else if (!e.target.checked) {
                          removeItemByKeyAndValue("eventTypeIds", eventType.id);
                        }
                      }}
                      label={eventType.title}
                    />
                  ))}
              </Fragment>
            ))}
        </FilterCheckboxFieldsContainer>
      ) : (
        <h2 className="text-default px-4 py-2 text-sm font-medium">{t("no_options_available")}</h2>
      )}
    </AnimatedPopover>
  );
};
