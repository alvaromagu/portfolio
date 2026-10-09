import { ui } from './ui'

export const locales = Object.keys(ui)
export type Locale = keyof typeof ui
export type TFn = <V extends keyof (typeof ui)[Locale]>(
  key: V
) => (typeof ui)[Locale][V]

export function useTranslation<T extends Locale>(locale: T): TFn {
  return <V extends keyof (typeof ui)[T]>(key: V): (typeof ui)[T][V] => {
    return ui[locale][key]
  }
}
