export type PersonType = "coach" | "member";
export type MembershipType = "coach" | "member";
export type TrackingItemResponseType = "checkbox" | "number" | "date" | "select";

export type ClassRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

export type GroupRow = {
  id: string;
  class_id: string;
  name: string;
  code: string;
  description: string;
  created_at: string;
  updated_at: string;
  class?: {
    id: string;
    code: string;
    name: string;
  } | null;
};

export type ClassCourseItemRow = {
  id: string;
  class_id: string;
  course_date: string | null;
  instructor_name: string;
  bg_color: string;
  sort_order: number;
  created_by_account_id: string | null;
  updated_by_account_id: string | null;
  created_at: string;
  updated_at: string;
  class?: {
    id: string;
    code: string;
    name: string;
  } | null;
};

export type ClassCourseTopicRow = {
  id: string;
  class_course_item_id: string;
  title: string;
  bg_color: string;
  sort_order: number;
  created_by_account_id: string | null;
  updated_by_account_id: string | null;
  created_at: string;
  updated_at: string;
  item?: {
    id: string;
    class_id: string;
    course_date: string | null;
    instructor_name: string;
    bg_color: string;
    sort_order: number;
  } | null;
};

export type ClassCourseChapterRow = {
  id: string;
  class_course_topic_id: string;
  title: string;
  paper_page: string;
  sort_order: number;
  created_by_account_id: string | null;
  updated_by_account_id: string | null;
  created_at: string;
  updated_at: string;
  topic?: {
    id: string;
    class_course_item_id: string;
    title: string;
    sort_order: number;
  } | null;
};

export type GroupStudySessionMode = "offline" | "online";

export type GroupStudySessionRow = {
  id: string;
  group_id: string;
  title: string;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
  mode: GroupStudySessionMode;
  location_address: string;
  map_url: string;
  online_meeting_url: string;
  note: string;
  sort_order: number;
  created_by_account_id: string | null;
  updated_by_account_id: string | null;
  created_at: string;
  updated_at: string;
  group?: {
    id: string;
    name: string;
    code: string;
  } | null;
};

export type GroupStudySessionDutyMemberRow = {
  id: string;
  group_id: string;
  session_id: string;
  person_id: string;
  note: string;
  sort_order: number;
  created_by_account_id: string | null;
  updated_by_account_id: string | null;
  created_at: string;
  updated_at: string;
  session?: {
    id: string;
    title: string;
    session_date: string | null;
    sort_order: number;
  } | null;
  person?: {
    id: string;
    person_no: string | null;
    full_name: string;
    display_name: string;
    email: string;
  } | null;
};

export type GroupStudyReadingItemRow = {
  id: string;
  group_id: string;
  session_id: string;
  class_course_chapter_id: string | null;
  title: string;
  paper_page: string;
  note: string;
  sort_order: number;
  created_by_account_id: string | null;
  updated_by_account_id: string | null;
  created_at: string;
  updated_at: string;
  session?: {
    id: string;
    title: string;
    session_date: string | null;
    sort_order: number;
  } | null;
  chapter?: {
    id: string;
    title: string;
    paper_page: string;
    sort_order: number;
  } | null;
};

export type GroupStudyReadingAssignmentRow = {
  id: string;
  group_id: string;
  reading_item_id: string;
  person_id: string | null;
  is_coach_led: boolean;
  note: string;
  created_by_account_id: string | null;
  updated_by_account_id: string | null;
  created_at: string;
  updated_at: string;
  reading_item?: {
    id: string;
    session_id: string;
    title: string;
    paper_page: string;
    sort_order: number;
  } | null;
  person?: {
    id: string;
    person_no: string | null;
    full_name: string;
    display_name: string;
    email: string;
  } | null;
};

export type PersonRow = {
  id: string;
  person_no: string | null;
  full_name: string;
  display_name: string;
  person_type: PersonType;
  email: string;
  phone: string;
  line_id: string;
  intro: string;
  created_at: string;
  updated_at: string;
};

export type MembershipRow = {
  id: string;
  group_id: string;
  person_id: string;
  membership_type: MembershipType;
  is_leader: boolean;
  created_at: string;
  group?: {
    id: string;
    name: string;
    code: string;
  } | null;
  person?: {
    id: string;
    full_name: string;
    display_name: string;
    person_type: PersonType;
  } | null;
};

export type RoleDefinitionRow = {
  id: string;
  group_id: string;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
  group?: {
    id: string;
    name: string;
    code: string;
  } | null;
};

export type RoleAssignmentRow = {
  id: string;
  group_id: string;
  role_id: string;
  person_id: string;
  note: string;
  created_at: string;
  group?: {
    id: string;
    name: string;
    code: string;
  } | null;
  role?: {
    id: string;
    name: string;
  } | null;
  person?: {
    id: string;
    full_name: string;
    display_name: string;
  } | null;
};

export type GroupCoachOwnerRow = {
  group_id: string;
  coach_account_id: string;
  created_at: string;
  updated_at: string;
  coach?: {
    id: string;
    email: string;
    display_name: string;
    coach_status: "pending" | "approved" | "rejected";
    is_active: boolean;
  } | null;
};

export type TrackingSectionRow = {
  id: string;
  group_id: string;
  title: string;
  description: string;
  sort_order: number;
  created_by_account_id: string | null;
  updated_by_account_id: string | null;
  created_at: string;
  updated_at: string;
  group?: {
    id: string;
    name: string;
    code: string;
  } | null;
};

export type TrackingSubsectionRow = {
  id: string;
  group_id: string;
  section_id: string;
  title: string;
  description: string;
  is_system_default: boolean;
  sort_order: number;
  created_by_account_id: string | null;
  updated_by_account_id: string | null;
  created_at: string;
  updated_at: string;
  group?: {
    id: string;
    name: string;
    code: string;
  } | null;
  section?: {
    id: string;
    title: string;
    sort_order: number;
  } | null;
};

export type TrackingItemRow = {
  id: string;
  group_id: string;
  section_id: string;
  subsection_id: string;
  title: string;
  content: string;
  extra_data: string;
  external_url: string;
  response_type: TrackingItemResponseType;
  response_options: string[];
  due_date: string | null;
  owner_person_id: string | null;
  progress_percent: number;
  is_completed: boolean;
  completed_at: string | null;
  completed_by_person_id: string | null;
  sort_order: number;
  copied_from_item_id: string | null;
  moved_from_section_id: string | null;
  moved_from_subsection_id: string | null;
  moved_at: string | null;
  created_by_account_id: string | null;
  updated_by_account_id: string | null;
  created_at: string;
  updated_at: string;
  group?: {
    id: string;
    name: string;
    code: string;
  } | null;
  section?: {
    id: string;
    title: string;
    sort_order: number;
  } | null;
  subsection?: {
    id: string;
    title: string;
    sort_order: number;
  } | null;
  owner?: {
    id: string;
    person_no: string | null;
    full_name: string;
    display_name: string;
    email: string;
  } | null;
  completed_by?: {
    id: string;
    person_no: string | null;
    full_name: string;
    display_name: string;
    email: string;
  } | null;
};

export type TrackingItemMemberCompletionRow = {
  id: string;
  group_id: string;
  item_id: string;
  person_id: string;
  is_completed: boolean;
  number_value: number | null;
  date_value: string | null;
  select_value: string | null;
  completed_at: string | null;
  completed_by_account_id: string | null;
  created_at: string;
  updated_at: string;
};

export type GroupTrackingProgressRow = {
  group_id: string;
  total_items: number;
  completed_items: number;
  completion_percent: number;
};

export type TrackingSectionProgressRow = {
  section_id: string;
  group_id: string;
  total_items: number;
  completed_items: number;
  completion_percent: number;
};
