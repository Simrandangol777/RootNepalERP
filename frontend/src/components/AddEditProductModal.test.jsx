import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import AddEditProductModal from "./AddEditProductModal";
import { renderWithRouter } from "../test/renderWithRouter";

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
  },
}));

vi.mock("../api/axios", () => ({
  default: mockApi,
}));

describe("AddEditProductModal", () => {
  test("shows validation errors when required fields are missing", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    mockApi.get.mockImplementation((url) => {
      if (url === "categories/") return Promise.resolve({ data: [] });
      if (url === "suppliers/") return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderWithRouter(
      <AddEditProductModal product={null} onClose={vi.fn()} onSave={onSave} />
    );

    await user.click(screen.getByRole("button", { name: /add product/i }));

    expect(
      await screen.findByText(/please fix the highlighted fields and try again/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/product name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/category is required/i)).toBeInTheDocument();
    expect(screen.getByText(/sku number is required/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  test("submits normalized product data in edit mode", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const product = {
      id: 3,
      name: "Tibetan Incense",
      description: "Herbal incense",
      category: 1,
      skuNumber: "SK-ABC",
      costPrice: 80,
      sellingPrice: 120,
      price: 120,
      stock: 9,
      supplier: "7",
      supplierEmail: "supplier@example.com",
      supplierPhone: "9800000000",
      supplierCompany: "Root Supplier",
      supplierAddress: "Kathmandu",
      supplierLeadTimeDays: 4,
      supplierMinimumOrderQuantity: 10,
      reorderLevel: 5,
      tags: ["featured", "gift"],
      status: "Active",
    };

    mockApi.get.mockImplementation((url) => {
      if (url === "categories/") {
        return Promise.resolve({
          data: [{ id: 1, name: "Incense", status: "Active" }],
        });
      }
      if (url === "suppliers/") {
        return Promise.resolve({
          data: [{ id: 7, name: "Root Supplier", is_active: true }],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithRouter(
      <AddEditProductModal product={product} onClose={vi.fn()} onSave={onSave} />
    );

    const nameInput = screen.getByPlaceholderText(/enter product name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Incense");

    await user.click(screen.getByRole("button", { name: /update product/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Updated Incense",
        category: 1,
        skuNumber: "SK-ABC",
        costPrice: 80,
        sellingPrice: 120,
        price: 120,
        stock: 9,
        reorderLevel: 5,
        supplier: "7",
        supplierLeadTimeDays: 4,
        supplierMinimumOrderQuantity: 10,
        tags: ["featured", "gift"],
        removeImage: false,
      })
    );
  });
});
