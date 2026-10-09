export enum Tecnology {
  Github = '/icons/github.svg',
  Angular = '/icons/angular.svg',
  HTML = '/icons/html.svg',
  Javascript = '/icons/javascript.svg',
  CSS = '/icons/css.svg',
  CSharp = '/icons/csharp.svg',
  Kotlin = '/icons/kotlin.svg',
  NodeJS = '/icons/nodejs.svg',
  MongoDB = '/icons/mongodb.svg',
  React = '/icons/react.svg',
  Flutter = '/icons/flutter.svg'
}

export interface ProjectI {
  name: string
  description?: string
  github: string
  web?: string
  image: {
    dark: string
    light: string
  }
  technologies: Tecnology[]
}
