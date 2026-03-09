export type Profile = {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  bio: string | null
  handicap: number | null
  home_course: string | null
  location: string | null
  occupation: string | null
  company: string | null
  linkedin_url: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export type Course = {
  id: string
  name: string
  parent_club: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  lat: number | null
  lng: number | null
  holes: number
  par: number
  slope_rating: number | null
  course_rating: number | null
  website: string | null
  phone: string | null
  image_url: string | null
  created_at: string
}

export type RoundStatus = 'planned' | 'active' | 'completed'

export type Round = {
  id: string
  user_id: string
  course_id: string | null
  status: RoundStatus
  tee_time: string | null
  score: number | null
  score_details: Record<string, number> | null
  notes: string | null
  is_public: boolean
  created_at: string
  updated_at: string
  profiles?: Profile
  courses?: Course
}

export type InviteStatus = 'pending' | 'accepted' | 'declined'

export type RoundInvite = {
  id: string
  round_id: string
  inviter_id: string
  invitee_id: string
  status: InviteStatus
  message: string | null
  created_at: string
  inviter?: Profile
  invitee?: Profile
  rounds?: Round
}

export type Post = {
  id: string
  user_id: string
  round_id: string | null
  content: string | null
  image_urls: string[]
  likes_count: number
  comments_count: number
  created_at: string
  profiles?: Profile
  rounds?: Round & { courses?: Course }
}

export type Comment = {
  id: string
  user_id: string
  post_id: string
  content: string
  created_at: string
  profiles?: Profile
}

export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor'
export type ListingStatus = 'active' | 'sold' | 'removed'
export type ListingCategory =
  | 'drivers'
  | 'woods'
  | 'hybrids'
  | 'irons'
  | 'wedges'
  | 'putters'
  | 'bags'
  | 'balls'
  | 'apparel'
  | 'accessories'
  | 'other'

export type Listing = {
  id: string
  seller_id: string
  title: string
  description: string | null
  category: ListingCategory
  condition: ListingCondition
  price: number
  image_urls: string[]
  location: string | null
  status: ListingStatus
  created_at: string
  updated_at: string
  profiles?: Profile
}

export type ConnectionStatus = 'pending' | 'accepted' | 'blocked'

export type Connection = {
  id: string
  requester_id: string
  addressee_id: string
  status: ConnectionStatus
  created_at: string
  requester?: Profile
  addressee?: Profile
}

export type Message = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  read: boolean
  created_at: string
  sender?: Profile
  receiver?: Profile
}

export type MeetupMessage = {
  id: string
  meetup_id: string
  user_id: string
  content: string
  created_at: string
  profiles?: Profile
}

export type MeetupAttendee = {
  id: string
  meetup_id: string
  user_id: string
  created_at: string
  profiles?: Profile
}

export type Meetup = {
  id: string
  title: string
  description: string | null
  course_id: string | null
  tee_time: string
  max_players: number
  organizer_id: string
  created_at: string
  profiles?: Profile
  courses?: Course
  meetup_attendees?: MeetupAttendee[]
}

export type AvailabilityStatus = 'open' | 'closed'

export type Availability = {
  id: string
  user_id: string
  date: string
  status: AvailabilityStatus
  note: string | null
  created_at: string
  profiles?: Profile
}
