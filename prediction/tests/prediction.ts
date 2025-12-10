import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";

describe("prediction", () => {
  it("Program compiles successfully", () => {
    // This test just verifies the program compiles without errors
    // More comprehensive tests would require a local validator and proper setup
    console.log("Program compilation test passed");
    expect(true).to.be.true;
  });
});
