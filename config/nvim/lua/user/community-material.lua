local M = {}

-- Define helper
local function hl(group, opts)
  vim.api.nvim_set_hl(0, group, opts)
end

-- Your colors
local c = {
  Color0 = "#4A4A4A",
  White = "#EEFFFF",
  Color2 = "#FF5370",
  Color3 = "#C792EA",
  Color4 = "#89DDFF",
  Color5 = "#82AAFF",
  Color6 = "#F78C6C",
  Color7 = "#C3E88D",
  Color8 = "#616161",
  Color9 = "#1a1a1a",
  Color11 = "#212121",
  Color12 = "#2e3129",
  Color13 = "#3c272a",
  Color14 = "#353535",
  Color15 = "#424242",
  Color16 = "#848484",
  TrueWhite = "#ffffff",
  ErrorCol = "#FF5370",
  Prop = "#f07178",
  Type = "#FFCB6B",
}

-- Apply highlights
local function apply_highlights()
  -- Editor UI
  hl("Normal", { fg = c.White, bg = c.Color11 })
  hl("NormalFloat", { fg = c.White, bg = c.Color9 })
  hl("CursorLine", { bg = "#000000" })
  hl("CursorLineNr", { fg = c.Color16, bold = true })
  hl("LineNr", { fg = c.Color15 })
  hl("Visual", { bg = "#616161" })
  hl("Search", { bg = c.Color6, fg = c.Color9 })
  hl("IncSearch", { bg = c.Color5, fg = c.Color9 })
  hl("StatusLine", { fg = c.White, bg = c.Color9 })
  hl("StatusLineNC", { fg = c.Color16, bg = c.Color9 })
  hl("VertSplit", { fg = c.Color15, bg = c.Color11 })
  hl("Pmenu", { fg = c.White, bg = c.Color11 })
  hl("PmenuSel", { fg = c.TrueWhite, bg = "#000000" })
  hl("PmenuSbar", { bg = c.Color15 })
  hl("PmenuThumb", { bg = c.Color8 })
  hl("TabLine", { fg = c.Color16, bg = c.Color9 })
  hl("TabLineSel", { fg = c.TrueWhite, bg = c.Color11 })
  hl("TabLineFill", { bg = c.Color9 })
  hl("WinSeparator", { fg = c.Color15 })
  hl("FloatBorder", { fg = "#FFFFFF", bg = c.Color11 })

  -- Syntax
  hl("Comment", { fg = c.Color0, italic = true })
  hl("Constant", { fg = c.Color6 })
  hl("String", { fg = c.Color7 })
  hl("Character", { fg = c.Color7 })
  hl("Number", { fg = c.Color6 })
  hl("Boolean", { fg = c.Color6 })
  hl("Float", { fg = c.Color6 })
  hl("Identifier", { fg = c.White })
  hl("Function", { fg = c.Color5 })
  hl("Statement", { fg = c.Color3 })
  hl("Conditional", { fg = c.Color3, italic = true })
  hl("Repeat", { fg = c.Color3 })
  hl("Label", { fg = c.Color3 })
  hl("Operator", { fg = c.Color4 })
  hl("Keyword", { fg = c.Color3, italic = true })
  hl("Exception", { fg = c.Color3 })
  hl("PreProc", { fg = c.Color3 })
  hl("Include", { fg = c.Color3 })
  hl("Define", { fg = c.Color3 })
  hl("Macro", { fg = c.Color3 })
  hl("Type", { fg = c.Type })
  hl("StorageClass", { fg = c.Type })
  hl("Structure", { fg = c.Type })
  hl("Typedef", { fg = c.Type })
  hl("Special", { fg = c.Prop })
  hl("SpecialComment", { fg = c.Color0, italic = true })
  hl("Underlined", { fg = c.Color6, underline = true })
  hl("Error", { fg = c.ErrorCol, bold = true })
  hl("Todo", { fg = c.Color3, bg = c.Color11, bold = true })

  -- Markdown
  hl("markdownHeadingDelimiter", { fg = c.Color7 })
  hl("markdownCode", { fg = c.White })
  hl("markdownLinkText", { fg = c.Color3 })
  hl("markdownUrl", { fg = c.Color5, underline = true })
  hl("markdownBold", { fg = c.Prop, bold = true })
  hl("markdownItalic", { fg = c.Prop, italic = true })
  hl("markdownCodeBlock", { fg = c.Color7 })
  hl("markdownBlockquote", { fg = c.Color0, italic = true })

  -- Diagnostic
  hl("DiagnosticError", { fg = c.ErrorCol })
  hl("DiagnosticWarn", { fg = c.Type })
  hl("DiagnosticInfo", { fg = c.Color5 })
  hl("DiagnosticHint", { fg = c.Color4 })
  hl("DiagnosticUnderlineError", { undercurl = true, sp = c.ErrorCol })
  hl("DiagnosticUnderlineWarn", { undercurl = true, sp = c.Type })
  hl("DiagnosticUnderlineInfo", { undercurl = true, sp = c.Color5 })
  hl("DiagnosticUnderlineHint", { undercurl = true, sp = c.Color4 })

  -- Git signs
  hl("GitGutterAdd", { fg = c.Color7 })
  hl("GitGutterChange", { fg = c.Color3 })
  hl("GitGutterDelete", { fg = c.Color2 })

  -- Terminal colors
  vim.g.terminal_color_0 = "#000000"
  vim.g.terminal_color_1 = c.Color2
  vim.g.terminal_color_2 = c.Color7
  vim.g.terminal_color_3 = c.Type
  vim.g.terminal_color_4 = c.Color5
  vim.g.terminal_color_5 = c.Color3
  vim.g.terminal_color_6 = c.Color4
  vim.g.terminal_color_7 = c.TrueWhite
  vim.g.terminal_color_8 = c.Color0
  vim.g.terminal_color_9 = c.Color2
  vim.g.terminal_color_10 = c.Color7
  vim.g.terminal_color_11 = c.Type
  vim.g.terminal_color_12 = c.Color5
  vim.g.terminal_color_13 = c.Color3
  vim.g.terminal_color_14 = c.Color4
  vim.g.terminal_color_15 = c.TrueWhite
end

M.apply = apply_highlights
return M
