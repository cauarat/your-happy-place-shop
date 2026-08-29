import { describe, it, expect } from "vitest";
import { classify, isNotAProduct, shortName, cleanDescription, readSupplierTitle } from "@/lib/curation";
import curationTable from "../../data/curation/union-kingdom.json";

describe("classify", () => {
  it("files a garment by the word the title ends on", () => {
    expect(classify("220gsm washed black 100% cotton loose fit blank t-shirt")).toBe("T-Shirt");
    expect(classify("480gsm 100% Cotton French Terry Raglan Boxy Cropped Fit Zip-up")).toBe("Zip-up");
    expect(classify("350gsm Baggy Fit Pleated Pant")).toBe("Pants");
    expect(classify("380g 100% Cotton Slim And Cropped Fit Waffle Weave Tank Top")).toBe("Tank top");
  });

  it("does not read a t-shirt as a shirt", () => {
    // The regression this rule exists for: matching `shirt` as plain text
    // emptied all seventeen tees into the shirt department.
    expect(classify("240gsm 100% cotton boxy cropped fit blank t-shirt")).toBe("T-Shirt");
    expect(classify("200gsm 100% Slub Cotton Regular Fit Blank T-shirt")).toBe("T-Shirt");
  });

  it("reads a shirt as a shirt, however the sleeves are described", () => {
    expect(classify("170gsm 100% Cotton Boxy Cropped Fit Plaid Flannel Short-sleeved Shirt")).toBe("Shirt");
    expect(classify("180gsm 100% Cotton Oxford Weave Boxy Cropped Fit Long-sleeved Shirt")).toBe("Shirt");
    expect(classify("110gsm 100% Cotton Boxy Cropped Fit Cuban Shirt")).toBe("Shirt");
  });

  it("does not read a sweatshirt as a shirt", () => {
    expect(classify("360gsm 100% Cotton Boxy Cropped Fit Quarter-zip Sweatshirt")).toBe("sweater");
  });

  it("calls two garments a set, whether written with 'and' or as one word", () => {
    expect(classify("600gsm 100% Cotton Fleece Cropped Fit Hoodie And Baggy Fit Sweatpants")).toBe("Set");
    expect(classify("360gsm Oversize Blank Sweatpants And Tracksuit")).toBe("Set");
    expect(classify("450gsm 100% Cotton Fleece Cropped Fit Blank Tracksuits")).toBe("Set");
    expect(classify("350gsm/420gsm Terry Texture T-shirt and Shorts Set")).toBe("Set");
  });

  it("is not fooled by 'and' between two words for the same garment", () => {
    expect(classify("380g 100% Cotton Slim And Cropped Fit Tank Top")).toBe("Tank top");
  });

  it("says nothing about a title that names no garment", () => {
    expect(classify("How to contact us? How to buy?")).toBeNull();
    expect(classify("How to view inventory?")).toBeNull();
    expect(isNotAProduct("How to view inventory?")).toBe(true);
    expect(isNotAProduct("350gsm Baggy Fit Pleated Pant")).toBe(false);
  });
});

describe("shortName", () => {
  it("keeps what tells one blank from another and drops what they all say", () => {
    expect(shortName("220gsm Union Kingdom washed black 100% cotton loose fit blank t-shirt")).toBe(
      "220gsm Washed Black Cotton Loose T-Shirt"
    );
  });

  it("drops the supplier's internal tags", () => {
    expect(
      shortName("[Restocking]320gsm Union Kingdom 100% Cotton Boxy Cropped Fit Plaid Flannel Jacket")
    ).toBe("320gsm Cotton Boxy Cropped Plaid Flannel Jacket");
    expect(shortName("[discount price: ¥49]Blank Washed Hoodie And Crewneck")).toBe(
      "Washed Hoodie & Crewneck"
    );
  });

  it("corrects the supplier's spelling rather than shipping it", () => {
    expect(shortName("480gsm Union Kingdom 100% Cotton Polar Fleece Boxy Cropped Fit Washed Zip-u")).toContain(
      "Zip-Up"
    );
    expect(shortName("320gsm Union Kingdom vintage washed 100% cotton regual shoulder blank t-shirt")).toContain(
      "Regular"
    );
  });

  it("keeps the casing a garment name is written with", () => {
    expect(shortName("240gsm Union Kingdom 100% cotton boxy cropped fit blank t-shirt")).toContain("T-Shirt");
    expect(shortName("360gsm Union Kingdom 100% Cotton Boxy Cropped Fit Quarter-zip Sweatshirt")).toContain(
      "Quarter-Zip"
    );
  });

  it("keeps the weight, which is what a blanks buyer compares first", () => {
    expect(shortName("350gsm Union Kingdom Baggy Fit Pleated Pant")).toBe("350gsm Baggy Pleated Pants");
    expect(shortName("350gsm/420gsm Terry Texture T-shirt and Shorts Set")).toContain("350gsm/420gsm");
  });

  it("cuts a specification down to something a card can show", () => {
    const specification =
      "600gsm Union Kingdom 100% Cotton Fleece Cropped Fit Hoodie And Baggy Fit Sweatpants";
    const name = shortName(specification);

    expect(name).toBe("600gsm Fleece Cropped Hoodie & Baggy Sweatpants");
    expect(name.length).toBeLessThan(specification.length / 1.7);
  });

  it("says one thing per set, not two garments in a sentence", () => {
    expect(shortName("360gsm Union Kingdom Oversize Blank Sweatpants And Tracksuit")).toContain("&");
    // "and" between two words for the same garment is not a set, and stays.
    expect(shortName("380g Union Kingdom 100% Cotton Slim And Cropped Fit Waffle Weave Tank Top")).toContain(
      "And"
    );
  });
});

describe("the curation table", () => {
  // The rule writes the first pass; a person reads it and shortens what the
  // rule could not. These are the guarantees that survive that review, and the
  // table is what actually reaches the shop.
  const table = curationTable as {
    remove: { id: string; was: string }[];
    products: { id: string; name: string; category: string; description?: string }[];
  };

  it("covers every Union Kingdom product exactly once", () => {
    const ids = table.products.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(table.products).toHaveLength(75);
    expect(table.remove).toHaveLength(2);
  });

  it("gives every product a name the card can show and a department", () => {
    for (const row of table.products) {
      expect(row.name.length, row.name).toBeLessThanOrEqual(45);
      expect(row.name).not.toMatch(/union kingdom/i);
      expect(row.name).not.toMatch(/[[\]]/);
      expect(row.category.length).toBeGreaterThan(0);
    }
  });

  it("files nothing under the supplier's collections", () => {
    const departments = new Set(table.products.map((row) => row.category));
    expect(departments.has("Premium Collection")).toBe(false);
    expect(departments.has("Union Kingdom")).toBe(false);
    expect(departments.has("ALL Blanks")).toBe(false);
  });

  it("removes only what names no garment", () => {
    for (const row of table.remove) expect(classify(row.was)).toBeNull();
  });

  it("agrees with the rule about every department", () => {
    for (const row of table.products) expect(row.category).toBe(classify(row.name));
  });
});

describe("cleanDescription", () => {
  it("keeps the specification and drops the supplier's note to itself", () => {
    expect(
      cleanDescription("[Restocking]320gsm Union Kingdom 100% Cotton Boxy Cropped Fit Plaid Flannel Jacket")
    ).toBe("320gsm Union Kingdom 100% Cotton Boxy Cropped Fit Plaid Flannel Jacket");
  });
});

describe("readSupplierTitle", () => {
  const vans = (title: string) => readSupplierTitle(title, "Vans");

  it("keeps the English model and drops the price, the Chinese and the style code", () => {
    const { name, styleCode } = vans(
      "￥220 SK8摩卡棕 万斯 经典低帮时尚板鞋 VN0A4UWI5A3 Tudor x Vans Sk8-Low Reissue SF 'Java Turtledove'"
    );
    expect(name).toBe("Tudor x Vans Sk8-Low Reissue SF 'Java Turtledove'");
    expect(styleCode).toBe("VN0A4UWI5A3");
  });

  it("drops the whole token when a Latin prefix is glued to the Chinese", () => {
    // "SK8摩卡棕" is one token; stripping only the CJK characters would leave
    // "SK8" at the front of the shopper's name.
    expect(vans("￥220 SK8摩卡棕 万斯 经典低帮时尚板鞋 VN0A5KXDBZW Vans Sk8-Low 'Contrast Black White'").name)
      .toBe("Sk8-Low 'Contrast Black White'");
  });

  it("takes the style code that follows the Chinese, not the supplier's own shorthand", () => {
    // Two tokens match the style-code shape; only the second is the real one.
    const { name, styleCode } = vans(
      "￥240 PRO166V 万斯 经典高帮时尚板鞋 VN0A5FCCBLK Vans Skate Classics SK8 HI Retro Skateboarding Shoes Black"
    );
    expect(styleCode).toBe("VN0A5FCCBLK");
    expect(name).toBe("Skate Classics SK8 HI Retro Skateboarding Shoes Black");
  });

  it("does not repeat the brand the product is already filed under", () => {
    expect(vans("￥220 AUT纯白 万斯 经典低帮时尚板鞋 VN000W4NDI0 Vans Vans Authentic 'Golden Coast'").name)
      .toBe("Authentic 'Golden Coast'");
    expect(vans("￥220 OS黑白 万斯 经典低帮时尚板鞋 VN0A38G1P0S1 Vans Old Skool Primary Check \"White/Black\"").name)
      .toBe("Old Skool Primary Check \"White/Black\"");
  });

  it("keeps a collaborator's own use of the brand mid-name", () => {
    expect(vans("￥220 联名黑绿 万斯 经典低帮时尚板鞋 SATOSHI NAKAMOTO x Vans Old Skool Reissue 36 'Pearlized Army'").name)
      .toBe("SATOSHI NAKAMOTO x Vans Old Skool Reissue 36 'Pearlized Army'");
  });

  it("leaves the join behind as nothing when the first collaborator was Chinese", () => {
    expect(vans("￥220 特联名 万斯 经典低帮时尚板鞋 VN000CS0BHD x HIRONO Knu Skool 'White Black'").name)
      .toBe("HIRONO Knu Skool 'White Black'");
  });

  it("does not title-case a model name", () => {
    // "SK8", "SF" and "LX" are how Vans writes them; shortName would not be.
    expect(vans("￥220 SF黑 万斯 板鞋 VN0A3MVLY28 Vans Style 36 Decon SF 'Black'").name)
      .toBe("Style 36 Decon SF 'Black'");
  });

  it("has nothing to do to a title that was never a supplier's", () => {
    expect(readSupplierTitle("Trainer Rose Pink", "Louis Vuitton").name).toBe("Trainer Rose Pink");
  });
});
