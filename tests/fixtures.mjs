export function towelListing() {
  return {
    title: { text: "IKEA RINNIG Cotton Dish Towels, 4 Pack", factIds: ["productName", "brand", "material", "packQuantity"] },
    itemHighlights: { text: "Check and stripe patterns with hanging loops for kitchen storage.", factIds: ["features", "structure", "useCases"] },
    bullets: [
      { text: "Made from 100% cotton.", factIds: ["material"] },
      { text: "Each towel measures 18 x 24 inches.", factIds: ["dimensions", "productName"] },
      { text: "Includes four towels.", factIds: ["packQuantity", "productName"] },
      { text: "Hanging loops provide storage when not in use.", factIds: ["structure"] },
      { text: "Check and stripe patterns for the kitchen.", factIds: ["features", "useCases"] },
    ],
    description: { text: "RINNIG dish towels have a flat-woven design with hanging loops. Use them for kitchen dish drying.", factIds: ["productName", "structure", "useCases"] },
    searchTerms: { text: "kitchen dish towel cloth check stripe hanging loop", factIds: ["productName", "useCases", "features", "structure"] },
  };
}
export function organizerListing() {
  return {
    title: { text: "White Pull-Out Desk Drawer Organizer", factIds: ["productName", "color", "features"] },
    itemHighlights: { text: "Semicircle front cutout for access to stationery and cards.", factIds: ["structure", "features"] },
    bullets: [
      { text: "Pull-out access for small items.", factIds: ["features"] },
      { text: "White drawer for desk organization.", factIds: ["productName", "color", "useCases"] },
      { text: "Semicircle front cutout.", factIds: ["structure"] },
      { text: "Store stationery and cards.", factIds: ["features"] },
      { text: "Use on a desk or under a shelf.", factIds: ["useCases"] },
    ],
    description: { text: "A white drawer organizer with pull-out access for stationery, cards and small items.", factIds: ["productName", "color", "features"] },
    searchTerms: { text: "desk drawer organizer stationery cards", factIds: ["productName", "features", "useCases"] },
  };
}
