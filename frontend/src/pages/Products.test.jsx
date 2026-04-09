import { screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import Products from "./Products";
import { renderWithRouter } from "../test/renderWithRouter";

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../api/axios", () => ({
  default: mockApi,
}));

vi.mock("../components/DashboardLayout", () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

describe("Products page", () => {
  test("loads and displays products from the API", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          name: "Tibetan Incense",
          description: "Handmade",
          category: 2,
          category_name: "Incense",
          sku_number: "SK-ABC",
          cost_price: "80.00",
          selling_price: "120.00",
          price: "120.00",
          stock: 18,
          reorder_level: 4,
          supplier: 5,
          status: "Active",
          tags: "Featured, Aromatic",
        },
      ],
    });

    renderWithRouter(<Products />);

    expect(screen.getByText("Products")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith("products/");
    });

    expect(await screen.findByText("Tibetan Incense")).toBeInTheDocument();
    expect(screen.getByText("SK-ABC")).toBeInTheDocument();
  });
});
