import type { MaybeRefOrGetter } from 'vue-demi'
import { ref } from 'vue-demi'
import { toValue } from '@vueuse/shared'
import type { ConfigurableDocument, ConfigurableWindow } from '../_configurable'
import { defaultWindow } from '../_configurable'

export interface UsePrintOptions extends ConfigurableWindow, ConfigurableDocument {
  /**
   * @default 'allow-modals allow-same-origin'
   */
  sandbox?: false | string
}

export function usePrint(initialValue?: MaybeRefOrGetter<string>, defaultOptions: UsePrintOptions = {}) {
  const pending = ref(false)

  function printUrl(url?: MaybeRefOrGetter<string>, options?: UsePrintOptions) {
    const value = url ? toValue(url) : initialValue ? toValue(initialValue) : undefined

    if (!value)
      return Promise.resolve()

    return print({ src: value }, options ?? defaultOptions)
  }

  function printSource(source?: MaybeRefOrGetter<string>, options?: UsePrintOptions) {
    const value = source ? toValue(source) : initialValue ? toValue(initialValue) : undefined

    if (!value)
      return Promise.resolve()

    return print({ srcdoc: value }, options ?? defaultOptions)
  }

  function print(attrs: { src: string } | { srcdoc: string }, options: UsePrintOptions) {
    const {
      window = defaultWindow,
      sandbox = 'allow-modals allow-same-origin',
    } = options ?? defaultOptions
    const document = defaultOptions.document ?? window?.document

    if (!document || pending.value)
      return Promise.resolve()

    pending.value = true

    return new Promise<void>((resolve) => {
      function startPrint(this: HTMLIFrameElement) {
        this.contentWindow?.addEventListener('beforeunload', closePrint)
        this.contentWindow?.addEventListener('afterprint', closePrint)

        this.contentWindow?.print()
      }

      function closePrint(this: HTMLIFrameElement) {
        try {
          this.remove()
        }
        catch {}

        pending.value = false
        resolve()
      }

      const iframe = document.createElement('iframe')
      try {
        iframe.addEventListener('load', startPrint)
        iframe.style.display = 'none'

        if (sandbox !== false) {
          // @ts-expect-error we can set sandbox before append to document
          iframe.sandbox = sandbox
        }

        if ('src' in attrs)
          iframe.src = attrs.src

        else
          iframe.srcdoc = attrs.srcdoc

        document.body.append(iframe)
      }
      catch {}
    })
  }

  return {
    pending,
    printUrl,
    printSource,
  }
}
