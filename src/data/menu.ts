export type Dish = {
  id: string;
  title: string;
  cuisine: "France" | "Italy" | "Japan" | "India" | "Spain" | "Patisserie";
  price: number; // GBP
  image: string;
  short: string;
  description: string;
  tags: string[];
  badge?: string;
  rating: number;
  reviews: number;
};

export const CUISINES = ["All", "France", "Italy", "Japan", "India", "Spain", "Patisserie"] as const;

export const MENU: Dish[] = [
  {
    id: "coq-au-vin",
    title: "Coq au Vin",
    cuisine: "France",
    price: 32,
    image: "/img/menu/1.jpg",
    short: "Free-range chicken braised in aged Burgundy, lardons & pommes purée",
    description:
      "Free-range chicken slow-braised in aged Burgundy with smoked lardons, pearl onions and wild mushrooms, finished with a velouté of pan juices and served with silky pommes purée.",
    tags: ["Signature", "Burgundy", "Slow-Cooked"],
    badge: "Signature",
    rating: 4.9,
    reviews: 128,
  },
  {
    id: "boeuf-bourguignon",
    title: "Bœuf Bourguignon",
    cuisine: "France",
    price: 38,
    image: "/img/menu/1.jpg",
    short: "48-hour braised short rib, red-wine reduction, glazed roots",
    description:
      "Short rib braised for 48 hours in Pinot Noir with a mirepoix of glazed root vegetables, smoked bacon and a deeply reduced red-wine jus.",
    tags: ["Beef", "Classic"],
    rating: 4.8,
    reviews: 74,
  },
  {
    id: "risotto-tartufo",
    title: "Risotto al Tartufo",
    cuisine: "Italy",
    price: 36,
    image: "/img/menu/2.jpg",
    short: "Carnaroli rice, aged Parmigiano & shaved Alba white truffle",
    description:
      "Carnaroli rice from the Po Valley slowly mantecato with aged Parmigiano-Reggiano, finished tableside with freshly shaved Alba white truffle and a whisper of brown butter.",
    tags: ["Vegetarian", "Alba Truffle", "Chef's Table"],
    badge: "Seasonal",
    rating: 4.8,
    reviews: 95,
  },
  {
    id: "tagliatelle-ragu",
    title: "Tagliatelle al Ragù",
    cuisine: "Italy",
    price: 26,
    image: "/img/menu/2.jpg",
    short: "Hand-rolled tagliatelle, slow Bolognese, Parmigiano",
    description:
      "Hand-rolled egg tagliatelle bound in a slow-cooked Bolognese of beef and pork, San Marzano tomato and soffritto, showered with aged Parmigiano.",
    tags: ["Pasta", "Classic"],
    rating: 4.7,
    reviews: 61,
  },
  {
    id: "wagyu-nigiri",
    title: "A5 Wagyu Nigiri Selection",
    cuisine: "Japan",
    price: 48,
    image: "/img/menu/3.jpg",
    short: "A5 Miyazaki wagyu seared over binchōtan, aged nikiri soy & gold leaf",
    description:
      "Five pieces of hand-pressed nigiri crowned with A5 Miyazaki wagyu, lightly seared over binchōtan, brushed with aged nikiri soy and a touch of fresh wasabi and gold leaf.",
    tags: ["A5 Wagyu", "Omakase", "Chef's Pick"],
    badge: "Most Loved",
    rating: 5.0,
    reviews: 210,
  },
  {
    id: "black-cod",
    title: "Miso Black Cod",
    cuisine: "Japan",
    price: 42,
    image: "/img/menu/3.jpg",
    short: "72-hour saikyo-miso marinated cod, pickled ginger",
    description:
      "Black cod marinated for 72 hours in sweet saikyo miso, grilled until caramelised and served with hajikami pickled ginger and a yuzu glaze.",
    tags: ["Seafood", "Signature"],
    rating: 4.9,
    reviews: 88,
  },
  {
    id: "rogan-josh",
    title: "Kashmiri Rogan Josh",
    cuisine: "India",
    price: 29,
    image: "/img/menu/4.jpg",
    short: "Slow-cooked Herdwick lamb, fragrant Kashmiri gravy, saffron & sheermal",
    description:
      "Slow-cooked Herdwick lamb shoulder in a fragrant Kashmiri gravy of ratan jot, fennel and Kashmiri chilli, finished with saffron and served with hand-rolled sheermal.",
    tags: ["Slow-Cooked", "Kashmiri", "Aromatic"],
    rating: 4.8,
    reviews: 74,
  },
  {
    id: "dal-makhani",
    title: "Dal Makhani",
    cuisine: "India",
    price: 18,
    image: "/img/menu/4.jpg",
    short: "Black lentils simmered overnight, cultured butter & cream",
    description:
      "Whole black urad lentils simmered overnight over gentle heat with tomato, ginger and a generous finish of cultured butter and cream.",
    tags: ["Vegetarian", "Comfort"],
    rating: 4.7,
    reviews: 52,
  },
  {
    id: "paella-valenciana",
    title: "Paella Valenciana",
    cuisine: "Spain",
    price: 34,
    image: "/img/menu/6.jpg",
    short: "Bomba rice, saffron, Carabineros prawns, clams & golden socarrat",
    description:
      "Bomba rice cooked over open flame in a traditional paellera with saffron, Carabineros prawns, clams, mussels and confit chicken, finished with a crown of golden socarrat.",
    tags: ["Wood-Fired", "Saffron", "Chef's Pick"],
    badge: "Chef's Pick",
    rating: 4.9,
    reviews: 88,
  },
  {
    id: "gambas-ajillo",
    title: "Gambas al Ajillo",
    cuisine: "Spain",
    price: 19,
    image: "/img/menu/6.jpg",
    short: "Sizzling garlic prawns, guindilla chilli, Manzanilla",
    description:
      "Plump prawns sizzled in Arbequina olive oil with sliced garlic, guindilla chilli and a splash of Manzanilla sherry, served bubbling in terracotta.",
    tags: ["Seafood", "Tapas"],
    rating: 4.8,
    reviews: 40,
  },
  {
    id: "creme-brulee",
    title: "Crème Brûlée à la Vanille",
    cuisine: "Patisserie",
    price: 14,
    image: "/img/menu/5.jpg",
    short: "Madagascar vanilla custard, caramelised sugar crust & sablé",
    description:
      "Silken Madagascar vanilla-bean custard beneath a crackling caramelised sugar crust, torched to order and served with a shortbread sablé and macerated summer berries.",
    tags: ["Sweet", "Vanilla", "Classic"],
    badge: "Classic",
    rating: 4.9,
    reviews: 56,
  },
  {
    id: "tarte-tatin",
    title: "Tarte Tatin",
    cuisine: "Patisserie",
    price: 15,
    image: "/img/menu/5.jpg",
    short: "Caramelised apple, puff pastry, crème fraîche",
    description:
      "Orchard apples caramelised in salted butter caramel, baked beneath buttery puff pastry and turned out warm with a quenelle of Normandy crème fraîche.",
    tags: ["Sweet", "Warm"],
    rating: 4.8,
    reviews: 47,
  },
];

export const money = (n: number) => "₹" + n.toFixed(n % 1 === 0 ? 0 : 2);
