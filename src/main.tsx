import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

import Game from "./Game"


//https://www.youtube.com/watch?v=oTIJunBa6MA&ab_channel=CosdenSolutions


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Game />
  </StrictMode>,
)
