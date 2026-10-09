export enum Tecnology {
  Angular = 'Angular',
  React = 'React',
  WebGPU = 'WebGPU'
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
