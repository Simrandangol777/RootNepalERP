import { Route, Routes } from "react-router-dom";
import { screen } from "@testing-library/react";

import ProtectedRoute from "./ProtectedRoute";
import { renderWithRouter } from "../test/renderWithRouter";

describe("ProtectedRoute", () => {
  test("redirects unauthenticated users to login", () => {
    renderWithRouter(
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>Protected content</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { route: "/protected" }
    );

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  test("renders children when an access token exists", () => {
    localStorage.setItem("access", "token");

    renderWithRouter(
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>Protected content</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { route: "/protected" }
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
