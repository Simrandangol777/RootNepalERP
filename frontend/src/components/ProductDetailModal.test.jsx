import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import ProductDetailModal from "./ProductDetailModal";
import { renderWithRouter } from "../test/renderWithRouter";

describe("ProductDetailModal", () => {
  test("renders details and switches tabs", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onEdit = vi.fn();

    renderWithRouter(
      <ProductDetailModal
        product={{
          name: "Tibetan Incense",
          description: "Relaxing herbal incense",
          categoryName: "Incense",
          skuNumber: "SK-ABC",
          price: 120,
          costPrice: 80,
          stock: 3,
          reorderLevel: 5,
          status: "Active",
          tags: ["featured", "gift"],
          supplierName: "Root Supplier",
          supplierEmail: "supplier@example.com",
          supplierPhone: "9800000000",
          supplierLeadTimeDays: 7,
          supplierMinimumOrderQuantity: 12,
        }}
        onClose={onClose}
        onEdit={onEdit}
      />
    );

    expect(screen.getByRole("heading", { name: "Tibetan Incense" })).toBeInTheDocument();
    expect(screen.getAllByText("Relaxing herbal incense")).toHaveLength(2);
    expect(screen.getByText("featured")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /inventory/i }));
    expect(screen.getByText(/low stock - reorder soon/i)).toBeInTheDocument();
    expect(screen.getByText(/rs\. 360\.00/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /supplier/i }));
    expect(screen.getByText("Root Supplier")).toBeInTheDocument();
    expect(screen.getByText("supplier@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /edit product/i }));
    await user.click(screen.getByRole("button", { name: /^close$/i }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
