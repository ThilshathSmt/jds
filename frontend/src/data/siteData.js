// Static content for the public landing page.
// Everything here is placeholder data that will later come from the backend / official sources.

import {
  FaAward,
  FaBookOpen,
  FaCalendarCheck,
  FaCartShopping,
  FaChalkboardUser,
  FaCircleInfo,
  FaFacebookF,
  FaFileLines,
  FaGraduationCap,
  FaHouse,
  FaImages,
  FaInstagram,
  FaNewspaper,
  FaPenToSquare,
  FaPhone,
  FaShieldHeart,
  FaTags,
  FaUserGraduate,
  FaYoutube,
} from 'react-icons/fa6'

// TODO: Replace with the official Jeslan Driving School phone number and email
export const contactInfo = {
  hotline: '077 XXX XXXX',
  email: 'info@jeslandrivingschool.lk',
  areas: ['Sammanthurai', 'Walathapity'],
}

// TODO: Replace "#" style links with the official social media pages
export const socialLinks = [
  { label: 'Facebook', href: '#facebook', icon: FaFacebookF },
  { label: 'YouTube', href: '#youtube', icon: FaYoutube },
  { label: 'Instagram', href: '#instagram', icon: FaInstagram },
]

// `to` is a router path. Links to sections that do not exist yet (e.g. /#gallery) are placeholders.
export const navLinks = [
  { label: 'Home', to: '/', icon: FaHouse },
  { label: 'Gallery', to: '/#gallery', icon: FaImages },
  // The footer (#contact) is on every page, so this stays on the current page
  { label: 'Contact Us', to: '#contact', icon: FaPhone },
  { label: 'Apply Now', to: '/apply', icon: FaPenToSquare, highlight: true },
]

export const features = [
  {
    title: 'Professional Driving Training',
    description: 'Learn from experienced instructors.',
    icon: FaUserGraduate,
  },
  {
    title: 'Safe & Supportive Learning',
    description: 'Build confidence in a friendly environment.',
    icon: FaShieldHeart,
  },
  {
    title: 'Flexible Training Options',
    description: 'Choose training that fits your schedule.',
    icon: FaCalendarCheck,
  },
  {
    title: 'Trusted Driving School',
    description: 'Focused on safe and responsible driving.',
    icon: FaAward,
  },
]

export const resources = [
  {
    title: 'About Us',
    description: 'Learn more about Jeslan Driving School',
    action: 'Read More',
    icon: FaCircleInfo,
  },
  {
    title: 'Student Portal',
    description: 'Access your student learning portal',
    action: 'Student Portal',
    icon: FaGraduationCap,
  },
  {
    title: 'Tutorials',
    description: 'Learn driving rules and techniques',
    action: 'View Tutorials',
    icon: FaChalkboardUser,
  },
  {
    title: 'Exam Papers',
    description: 'Practice with driving theory questions',
    action: 'View Papers',
    icon: FaFileLines,
  },
  {
    title: 'Our Packages',
    description: 'Explore our driving courses and packages',
    action: 'View Packages',
    icon: FaTags,
  },
  {
    title: 'Information Portal',
    description: 'Useful information for new drivers',
    action: 'Read More',
    icon: FaBookOpen,
  },
  {
    title: 'Blogs',
    description: 'Read our latest driving-related articles',
    action: 'Read Blogs',
    icon: FaNewspaper,
  },
  {
    title: 'Online Shop',
    description: 'Visit the Jeslan online shop',
    action: 'Visit Shop',
    icon: FaCartShopping,
  },
]

// Placeholder FAQ content: general guidance only, not official legal information.
// An item has either `answer` (paragraph) or `steps` (bullet list).
export const faqs = [
  {
    question: 'What is the process of getting a driving licence in Sri Lanka?',
    steps: [
      'Obtain the required medical fitness certificate.',
      'Register with the Department of Motor Traffic.',
      'Pass the written/theory test.',
      "Obtain the learner's permit.",
      'Complete the required learning period.',
      'Take the practical driving test.',
    ],
  },
  {
    question: 'What is the first thing to do to get a driving licence?',
    answer:
      'The first step is to obtain a medical fitness certificate from an approved medical centre.',
  },
  {
    question: 'Where are you located?',
    answer: 'Our current branches are located in Sammanthurai and Walathapity.',
  },
  {
    question: 'How long does it take to get a driving licence?',
    answer:
      "The duration depends on the learner's permit period, training progress and examination schedules.",
  },
  {
    question: 'What types of driving training do you provide?',
    answer:
      'We provide training for cars, motorcycles and other vehicle categories according to the available courses.',
  },
]

// TODO: Replace with official Jeslan Driving School addresses
export const locations = [
  {
    name: 'Sammanthurai',
    address: 'Main Street, Sammanthurai, Sri Lanka',
    phone: '077 XXX XXXX',
  },
  {
    name: 'Walathapity',
    address: 'Main Road, Walathapity, Sri Lanka',
    phone: '077 XXX XXXX',
  },
]

// TODO: Placeholder testimonials (not real reviews) - replace with genuine student feedback
export const testimonials = [
  {
    name: 'Student Name',
    initials: 'SN',
    course: 'Car Training',
    rating: 5,
    quote:
      'Jeslan Driving School helped me become much more confident on the road. The instructors were friendly and patient.',
  },
  {
    name: 'Student Name',
    initials: 'AR',
    course: 'Motorcycle Training',
    rating: 5,
    quote:
      'The training environment was very supportive and the lessons were easy to understand.',
  },
  {
    name: 'Student Name',
    initials: 'MF',
    course: 'Car Training',
    rating: 5,
    quote:
      'The theory lessons prepared me well for the written test, and the practical sessions were well organised.',
  },
  {
    name: 'Student Name',
    initials: 'KH',
    course: 'Car Training',
    rating: 4,
    quote:
      'I was nervous at the start, but the step-by-step guidance made learning to drive feel comfortable.',
  },
]

export const footerLinkGroups = [
  {
    title: 'Quick Links',
    links: [
      { label: 'Home', to: '/' },
      { label: 'About Us', to: '/#resources' },
      { label: 'Courses', to: '/#resources' },
      { label: 'Gallery', to: '/#gallery' },
      { label: 'Contact Us', to: '#contact' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Tutorials', to: '/#resources' },
      { label: 'Exam Papers', to: '/#resources' },
      { label: 'Packages', to: '/#resources' },
      { label: 'Student Portal', to: '/#resources' },
    ],
  },
]

export const legalLinks = [
  { label: 'Privacy Policy', href: '#privacy-policy' },
  { label: 'Terms & Conditions', href: '#terms-and-conditions' },
]
