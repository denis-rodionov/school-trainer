import { Topic, TopicAssignment } from '../types';

export const OPTION_GROUP_ONE = 1;

/** Groups with 2+ ready assignments that require a student choice before generation. */
export function getAssignmentsNeedingChoice(
  assignments: TopicAssignment[],
  topics: Map<string, Topic>,
  isReady: (topic: Topic | undefined) => boolean
): Map<number, TopicAssignment[]> {
  const byGroup = new Map<number, TopicAssignment[]>();

  for (const assignment of assignments) {
    if (assignment.optionGroup == null) continue;
    const list = byGroup.get(assignment.optionGroup) ?? [];
    list.push(assignment);
    byGroup.set(assignment.optionGroup, list);
  }

  const needsChoice = new Map<number, TopicAssignment[]>();
  Array.from(byGroup.entries()).forEach(([group, groupAssignments]) => {
    const ready = groupAssignments.filter((a) => isReady(topics.get(a.topicId)));
    if (ready.length >= 2) {
      needsChoice.set(group, ready);
    }
  });

  return needsChoice;
}

/** Keep ungrouped and single-member groups as-is; for multi-member groups keep only the chosen assignment. */
export function resolveAssignmentsForGeneration(
  assignments: TopicAssignment[],
  topics: Map<string, Topic>,
  isReady: (topic: Topic | undefined) => boolean,
  selectedByGroup: Map<number, string>
): TopicAssignment[] {
  const byGroup = new Map<number, TopicAssignment[]>();

  for (const assignment of assignments) {
    if (assignment.optionGroup == null) continue;
    const list = byGroup.get(assignment.optionGroup) ?? [];
    list.push(assignment);
    byGroup.set(assignment.optionGroup, list);
  }

  const skipTopicIds = new Set<string>();

  Array.from(byGroup.entries()).forEach(([group, groupAssignments]) => {
    const ready = groupAssignments.filter((a) => isReady(topics.get(a.topicId)));
    if (ready.length >= 2) {
      const chosenId = selectedByGroup.get(group);
      groupAssignments.forEach((assignment) => {
        if (assignment.topicId !== chosenId) {
          skipTopicIds.add(assignment.topicId);
        }
      });
    }
  });

  return assignments.filter((assignment) => !skipTopicIds.has(assignment.topicId));
}
