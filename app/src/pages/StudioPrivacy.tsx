import { Link } from 'react-router'

/** Factual disclosure for the implemented Studio, separate from the wider product roadmap. */
export default function StudioPrivacy() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 px-6 py-12 text-sm leading-relaxed text-text-mid">
      <h1 className="h2 text-text-hi">Your content in Creator Studio</h1>
      <p>Last updated: 14 October 2026.</p>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-hi">When your text leaves Kinjy</h2>
        <p>When real translation is enabled and you choose another language, Kinjy sends your text and the source and target languages to IleAI. Depending on the configured engine, IleAI forwards it to DeepL or to a language model provider such as OpenAI. This also applies to translated articles, newsletters, carousels, audio and videos.</p>
        <p>Only confirmed adult accounts can use external translation. Text from other accounts is not sent to these providers. When translation is simulated, results say so and cannot be published or sent as a newsletter.</p>
        <p>Articles and newsletters in your original language are made by restructuring your words. Images, synthetic narration and slide videos in that language are rendered on Kinjy's servers.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-hi">What Kinjy stores</h2>
        <p>Your source text, generated outputs and files are saved in your Studio history. Deleting a history entry removes that entry and its outputs. Files already used by a post can remain available through that post; delete the post separately.</p>
        <p>Real translations are also cached, including the source and translated text, so identical requests can reuse an answer. This cache can be shared between adult accounts and currently has no automatic expiry. Deleting a Studio entry does not remove the separate translation cache.</p>
        <p>AI usage records contain your account identifier, provider, model, language, character and token counts, timing, cost and success or failure. These usage records do not contain your text. Provider retention and use of data depend on the applicable provider agreement; this page does not promise that providers delete data immediately or exclude it from training.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-hi">Newsletters and publication</h2>
        <p>Nothing is published just because you generate it. You choose whether to publish immediately, schedule a post, or send a newsletter. AI provenance labels accompany the results.</p>
        <p>Newsletter readers provide an e-mail address and confirm it by e-mail. Kinjy stores the address, subscription state and delivery results; the creator sees counts and masked addresses. Sending passes the message and recipient address to the configured mail provider. Every newsletter includes a way to unsubscribe. Unsubscribing stops future delivery; it does not erase past delivery records.</p>
      </section>
      <Link to="/studio" className="inline-block font-semibold text-text-hi underline">Back to Creator Studio</Link>
    </article>
  )
}
