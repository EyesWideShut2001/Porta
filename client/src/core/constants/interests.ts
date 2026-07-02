import { Interest } from '../../types/member';

export type InterestGroup = {
  label: string;
  interests: Interest[];
};

export const interestGroups: InterestGroup[] = [
  {
    label: 'Lifestyle & outdoors',
    interests: [
      { id: 1, name: 'Hiking' },
      { id: 2, name: 'Camping' },
      { id: 3, name: 'Travel' },
      { id: 4, name: 'Road Trips' },
      { id: 5, name: 'Nature' },
      { id: 6, name: 'Beach' },
      { id: 7, name: 'Gardening' },
      { id: 8, name: 'Pets' },
      { id: 9, name: 'Volunteering' },
      { id: 10, name: 'Meditation' },
    ],
  },
  {
    label: 'Sports & fitness',
    interests: [
      { id: 11, name: 'Running' },
      { id: 12, name: 'Gym' },
      { id: 13, name: 'Yoga' },
      { id: 14, name: 'Cycling' },
      { id: 15, name: 'Swimming' },
      { id: 16, name: 'Football' },
      { id: 17, name: 'Basketball' },
      { id: 18, name: 'Tennis' },
      { id: 19, name: 'Skiing' },
      { id: 20, name: 'Dancing' },
    ],
  },
  {
    label: 'Culture & entertainment',
    interests: [
      { id: 21, name: 'Reading' },
      { id: 22, name: 'Writing' },
      { id: 23, name: 'Photography' },
      { id: 24, name: 'Movies' },
      { id: 25, name: 'TV Series' },
      { id: 26, name: 'Music' },
      { id: 27, name: 'Concerts' },
      { id: 28, name: 'Theatre' },
      { id: 29, name: 'Museums' },
      { id: 30, name: 'Podcasts' },
    ],
  },
  {
    label: 'Food & social',
    interests: [
      { id: 31, name: 'Cooking' },
      { id: 32, name: 'Baking' },
      { id: 33, name: 'Coffee' },
      { id: 34, name: 'Restaurants' },
      { id: 35, name: 'Board Games' },
    ],
  },
  {
    label: 'Creative & technology',
    interests: [
      { id: 36, name: 'Art' },
      { id: 37, name: 'Fashion' },
      { id: 38, name: 'Gaming' },
      { id: 39, name: 'Technology' },
      { id: 40, name: 'DIY Projects' },
    ],
  },
];

export const interests = interestGroups.flatMap((group) => group.interests);
