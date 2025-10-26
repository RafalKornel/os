-- ~/.config/nvim/colors/mytheme.lua
-- Standalone theme that sources your color overrides

-- First, clear existing highlights and set the basic environment
vim.cmd("hi clear")

if vim.fn.exists("syntax_on") then
  vim.cmd("syntax reset")
end

-- vim.o.background = "dark" -- or "light", depending on your preference
vim.g.colors_name = "community-material"

-- Load your custom color logic
-- Assuming this file defines highlights, sets colors, etc.
require("user.community-material").apply()
require("user.syntax-overrides").apply()
