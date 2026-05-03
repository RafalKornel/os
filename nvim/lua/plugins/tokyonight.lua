local M = {}

M.plugins = {
  {
    "folke/tokyonight.nvim",
    lazy = false, -- load at startup
    priority = 1000, -- ensure it loads first
    opts = {
      transparent = true,
      styles = {
        sidebars = "transparent",
        floats = "transparent",
      },
    },
    config = function()
      -- Transparent background
      vim.g.tokyonight_transparent = true

      -- Load colorscheme
      vim.cmd([[colorscheme tokyonight]])

      -- Apply custom highlights
      local status_ok, colors = pcall(require, "user.syntax-overrides")
      if status_ok and colors.apply then
        colors.apply()
      end

      -- Reapply highlights if colorscheme changes
      vim.api.nvim_create_autocmd("ColorScheme", {
        pattern = "*",
        callback = function()
          if status_ok and colors.apply then
            colors.apply()
          end
        end,
      })
    end,
  },
}

return M.plugins
