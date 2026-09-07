import { FACT_DEFINITIONS } from "./domain.ts";
import type { FactKey, ProductInput } from "./domain.ts";

export const TOWEL_SOURCE = "https://www.ikea.com/us/en/p/rinnig-dish-towel-white-dark-gray-patterned-20476346/";
export function blankProduct(): ProductInput {
  return { schemaVersion: 1, marketplace: "amazon-us", category: "家居用品", keywords: "", bannedTerms: [],
    facts: FACT_DEFINITIONS.map(({ key }) => ({ key, value: "", status: "pending", source: "seller", sourceNote: "" })) };
}

export function organizerDemo(): ProductInput {
  const p = blankProduct();
  p.category = "家居收纳";
  const values: Partial<Record<FactKey, string>> = {
    productName: "窄型抽屉收纳盒", color: "白色 / white",
    structure: "独立单格抽屉；正面半圆拉手 / Individual drawer with semicircle front cutout",
    features: "抽拉取物；收纳文具、卡片和小物 / Pull-out access for stationery, cards and small items",
    useCases: "桌面或置物架下方整理 / Desk or under-shelf organization",
  };
  p.facts = p.facts.map(f => values[f.key] ? { ...f, value: values[f.key]!, status: "confirmed", source: "photo", sourceNote: "用户提供的三张实物照片，人工整理可见特征；不代表已进行 AI 图片识别" } : f);
  p.keywords = "desk drawer organizer stationery storage";
  return p;
}

export function towelDemo(): ProductInput {
  const p = blankProduct(); p.category = "厨房纺织品";
  // Public manufacturer facts checked 2026-09-07. Not seller inventory or resale authorization.
  const values: Partial<Record<FactKey, string>> = {
    productName: "RINNIG 厨房擦拭巾 / RINNIG dish towel", brand: "IKEA",
    material: "100% cotton / 100% 棉", dimensions: "18 x 24 inches",
    color: "white / dark gray / patterned", packQuantity: "4 pack",
    structure: "平织；带悬挂环 / Flat-woven with hanging loop",
    features: "方格与条纹图案；悬挂收纳 / Check and stripe patterns; hanging storage",
    useCases: "厨房餐具擦拭 / Kitchen dish drying",
    care: "Machine wash up to 140°F / 60°C; do not bleach; tumble dry medium; iron high; do not dry clean; maximum shrinkage 4%",
  };
  p.facts = p.facts.map(f => values[f.key] ? { ...f, value: values[f.key]!, status: "confirmed", source: "official", sourceNote: `IKEA US · 204.763.46 · 核对日期 2026-09-07 · ${TOWEL_SOURCE}` } : { ...f, status: "not_applicable", sourceNote: "此演示不使用该属性" });
  p.keywords = "kitchen dish towel tea cloth";
  return p;
}
