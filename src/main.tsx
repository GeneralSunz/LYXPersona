import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/globals.css'
import './styles/design-tokens.css'
import './styles/textures.css'
import './styles/components.css'
// 氛围层放最后：它要覆盖 components.css 里若干元素的入场/视差表现
import './styles/atmosphere.css'

// Vite 的 BASE_URL 来自 --base 参数，GitHub Pages 部署时为 /仓库名/
// 用它作为 BrowserRouter 的 basename，确保路由路径正确
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
