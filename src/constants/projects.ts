import type { TFn } from '../i18n/i18n'
import { type ProjectI, Tecnology } from '../types/project'

export const getProjects = (t: TFn): ProjectI[] => {
  return [
    {
      name: t('projects.ia.chat'),
      github: 'https://github.com/alvaromagu/ia-chat',
      web: 'https://iallm.vercel.app/',
      image: {
        dark: '/images/iallm-dark.webp',
        light: '/images/iallm-light.webp'
      },
      technologies: [Tecnology.React, Tecnology.WebGPU]
    },
    {
      name: t('projects.bg.remover'),
      github: 'https://github.com/alvaromagu/bg-remover',
      web: 'https://bg-remover-seven.vercel.app/',
      image: {
        dark: '/images/bg-remover-dark.webp',
        light: '/images/bg-remover-light.webp'
      },
      technologies: [Tecnology.React]
    },
    {
      name: t('projects.chess'),
      github: 'https://github.com/alvaromagu/chess',
      web: 'https://chessdev.vercel.app/',
      image: {
        dark: '/images/chess-dark.webp',
        light: '/images/chess-light.webp'
      },
      technologies: [Tecnology.React]
    },
    {
      name: t('projects.cw.game'),
      github: 'https://github.com/alvaromagu/conways-game',
      web: 'https://alvaromg-cg.vercel.app/',
      image: {
        dark: '/images/cw-game-dark.webp',
        light: '/images/cw-game-light.webp'
      },
      technologies: [Tecnology.React]
    },
    {
      name: t('projects.wallhaven'),
      github: 'https://github.com/alvaromagu/wallhaven',
      web: 'https://wallhavendev.vercel.app/',
      image: {
        dark: '/images/wallhaven-dark.webp',
        light: '/images/wallhaven-light.webp'
      },
      technologies: [Tecnology.Angular]
    },
    {
      name: t('projects.pokeapp'),
      github: 'https://github.com/alvaromagu/pokeapp',
      web: 'https://pkdev.vercel.app/',
      image: {
        dark: '/images/pokeapp-dark.webp',
        light: '/images/pokeapp-light.webp'
      },
      technologies: [Tecnology.React]
    }
  ]
}
