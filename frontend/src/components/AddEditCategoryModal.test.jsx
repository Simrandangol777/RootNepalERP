import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import AddEditCategoryModal from "./AddEditCategoryModal";
import { renderWithRouter } from "../test/renderWithRouter";

describe("AddEditCategoryModal", () => {
  test("submits new category data", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderWithRouter(
      <AddEditCategoryModal category={null} onClose={vi.fn()} onSave={onSave} />
    );

    await user.type(screen.getByPlaceholderText(/enter category name/i), "Singing Bowls");
    await user.type(
      screen.getByPlaceholderText(/enter category description/i),
      "Handcrafted bowls"
    );
    await user.click(screen.getByRole("button", { name: /^add category$/i }));

    expect(onSave).toHaveBeenCalledWith({
      name: "Singing Bowls",
      description: "Handcrafted bowls",
      status: "Active",
      imageFile: null,
      removeImage: false,
    });
  });

  test("submits edited category data", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderWithRouter(
      <AddEditCategoryModal
        category={{
          name: "Incense",
          description: "Original description",
          status: "Active",
        }}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    await user.clear(screen.getByPlaceholderText(/enter category description/i));
    await user.type(
      screen.getByPlaceholderText(/enter category description/i),
      "Updated description"
    );
    await user.click(screen.getByLabelText(/inactive/i));
    await user.click(screen.getByRole("button", { name: /update category/i }));

    expect(onSave).toHaveBeenCalledWith({
      name: "Incense",
      description: "Updated description",
      status: "Inactive",
      imageFile: null,
      removeImage: false,
    });
  });
});
