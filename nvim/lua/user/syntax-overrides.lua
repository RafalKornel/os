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
  -- OVERRIDES
  -- Treesitter
  hl("TSKeywordDeclaration", { fg = c.Color3 })
  hl("@keyword", { fg = c.Color3 })
  hl("@keyword.function", { fg = c.Color3, italic = true })
  hl("@keyword.operator", { fg = c.Color3 })
  hl("@keyword.import", { fg = c.Color4 })
  hl("@keyword.export", { fg = c.Color4 })
  hl("@keyword.switch", { fg = c.Color4 })
  hl("@keyword.coroutine", { fg = c.Color4 })
  hl("@keyword.return", { fg = c.Color4 })

  hl("@variable.member.typescript", { fg = c.White })
  hl("@variable.builtin", { fg = c.Color6 })
  hl("@type.builtin", { fg = c.Color16 })

  hl("@lsp.typemod.variable.declaration", { fg = c.Prop })
  hl("@lsp.typemod.parameter.declaration", { fg = c.Prop })
  hl("@lsp.type.property.typescript", { fg = c.TrueWhite })
  hl("@lsp.type.interface.typescript", { fg = c.Type })
  hl("@lsp.type.parameter.typescript", { fg = c.TrueWhite })

  hl("@variable.parameter", { fg = c.Color2 })
  hl("@variable.import", { fg = c.White })
  hl("@variable", { fg = c.White })
  hl("@function", { fg = c.Color5 })
  hl("@function.builtin", { fg = c.Color5 })
  hl("@method", { fg = c.Color5, italic = true })
  hl("@method.call", { fg = c.Color5 })
  hl("@constructor", { fg = c.Type })
  hl("@constant", { fg = c.Color6 })
  hl("@constant.builtin", { fg = c.Color6 })
  hl("@constant.macro", { fg = c.Color6 })
  hl("@number", { fg = c.Color6 })
  hl("@string", { fg = c.Color7 })
  hl("@string.regex", { fg = c.Color4 })
  hl("@string.escape", { fg = c.Color4 })
  hl("@type", { fg = c.Type })
  -- hl('@type.builtin', { fg = '#B2CCD6' })
  hl("@class", { fg = c.Type })
  hl("@interface", { fg = c.Type })
  hl("@namespace", { fg = c.Type })
  hl("@comment", { fg = c.Color0, italic = true })
  hl("DiagnosticUnnecessary", { fg = c.Color16, italic = true })
  hl("DiagnosticHint", { fg = c.Color16, italic = true })
  hl("DiagnosticError", { fg = c.ErrorCol, italic = true })
  hl("DiagnosticInfo", { fg = c.ErrorCol, italic = true })
  hl("@decorator", { fg = c.Color5, italic = true })
  hl("@punctuation", { fg = c.Color4 })
  hl("@boolean", { fg = c.Color6 })
  hl("@null", { fg = c.Color6 })
  hl("@tag", { fg = c.Prop })
  hl("@tag.attribute", { fg = c.Color3, italic = true })
  hl("@tag.delimiter", { fg = c.Color4 })
  hl("@symbol", { fg = c.Color7 })
  hl("@constant.symbol", { fg = c.Color7 })
  hl("@conditional", { fg = c.Color4 })
  hl("@repeat", { fg = c.Color4 })
  hl("@property.json", { fg = c.Color3 })
  hl("@property.jsonc", { fg = c.Color3 })
end

M.apply = apply_highlights
return M
