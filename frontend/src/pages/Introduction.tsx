import { Cite, Refs, useShellLang } from '@fasl-work/caos-app-shell';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { SECTION_REFS } from '../data/citations';
import { loadBenchmark } from '../lib/artifacts';
import type { BenchmarkArtifact } from '../lib/contract.types';
import { OverviewDiagram } from '../viz/Diagrams';

export default function Introduction() {
  const lang = useShellLang();
  const [benchmark, setBenchmark] = useState<BenchmarkArtifact | null>(null);
  useEffect(() => {
    loadBenchmark().then(setBenchmark).catch(() => setBenchmark(null));
  }, []);

  const es = lang === 'es';

  return (
    <article className="fr-prose">
      <h1>{es ? 'Fragmentacion por voladura' : 'Blast fragmentation'}</h1>

      <p className="fr-lede">
        {es
          ? 'La voladura es la primera etapa de conminucion y el lugar mas barato para fragmentar roca. El tamano medio del material tronado determina la productividad del carguio, el rendimiento de la chancadora primaria y la energia del molino. Predecirlo antes de perforar es un problema con aspecto de resuelto, una literatura grande y un modelo de uso diario.'
          : 'Blasting is the first comminution stage and the cheapest place to break rock. The mean size of the muckpile sets loader productivity, primary-crusher throughput and mill energy. Predicting it before drilling is a solved-looking problem with a large literature and one model in daily use.'}
      </p>

      <p>
        {es
          ? 'Este producto toma ese modelo y los once que vinieron despues, los corre sobre 97 tiros reales medidos en diez campanas de cuatro continentes, y los puntua bajo tres formas distintas de partir los datos. La conclusion no es la que la literatura sugiere.'
          : 'This product takes that model and the eleven that came after it, runs them on 97 real measured blasts from ten campaigns on four continents, and scores them under three different ways of splitting the data. The conclusion is not the one the literature suggests.'}
      </p>

      <h2>{es ? 'El resultado' : 'The result'}</h2>

      <div className="fr-callout fr-callout-strong">
        <p>
          {es
            ? 'Al dejar fuera una campana completa, ninguno de los seis modelos aprendidos explica varianza alguna: todos quedan por debajo de predecir una constante. Los dos unicos modelos que resisten en un sitio que nunca vieron son los dos cuyos coeficientes son fijos en vez de ajustados.'
            : 'With a whole campaign held out, not one of the six learned models explains any variance: every one falls below predicting a constant. The only two models that hold up on a site they have never seen are the two whose coefficients are fixed rather than fitted.'}
        </p>
        {benchmark ? (
          <ul className="fr-callout-figures">
            {benchmark.verdict.arms_with_positive_variance_explained_across_sites.map(([arm, value]) => (
              <li key={arm}>
                <b>{value.toFixed(3)}</b>
                <span>{arm.replace(/-/g, ' ')}</span>
              </li>
            ))}
            <li className="fr-bad">
              <b>{benchmark.verdict.n_learned_arms_positive} / {benchmark.verdict.n_learned_arms}</b>
              <span>{es ? 'aprendidos positivos' : 'learned arms positive'}</span>
            </li>
          </ul>
        ) : null}
      </div>

      <p>
        {es
          ? 'El modelo clasico incluso mejora bajo el protocolo honesto, de negativo en una particion aleatoria a 0.311 al excluir un sitio, porque no tiene nada que sobreajustar. Eso invierte la lectura habitual del modelo clasico como la linea base debil.'
          : 'The classical model even improves under the honest protocol, from negative on a random split to 0.311 with a site held out, because it has nothing to overfit. That inverts the usual reading of the classical model as the weak baseline.'}
      </p>

      <OverviewDiagram />

      <h2>{es ? 'Quien usa esto' : 'Who this is for'}</h2>
      <p>
        {es
          ? 'Ingenieros de perforacion y voladura que eligen una malla antes de perforar; ingenieros de procesos que ajustan la fragmentacion para alimentar la chancadora; servicios tecnicos de proveedores de explosivos; y cursos de tronadura. La pregunta que responde es concreta: para esta roca y este banco, que malla alcanza el P80 que pide mi chancadora, y cuanta confianza merece la respuesta.'
          : 'Drill-and-blast engineers choosing a pattern before drilling, process engineers tuning fragmentation to feed a crusher, explosive-supplier technical services, and rock-blasting courses. The question it answers is concrete: for this rock and this bench, which pattern hits the P80 my crusher wants, and how much does the answer deserve to be trusted.'}
      </p>

      <h2>{es ? 'De donde vienen los datos' : 'Where the data comes from'}</h2>
      <p>
        {es
          ? 'Noventa y siete tiros de banco publicados con su tamano medio medido por analisis de imagen, mas dos conjuntos de validacion tambien publicados y cinco tiros de produccion de una fuente abierta. Los valores numericos son hechos experimentales reutilizados con cita; los articulos fuente no se redistribuyen.'
          : 'Ninety-seven published bench blasts with their mean size measured by image analysis, plus two published validation sets and five production blasts from an open-access source. Numeric values are experimental facts reused with citation; the source articles are not redistributed.'}{' '}
        <Cite id="hudaverdi2010" />
        <Cite id="kulatilake2012" />
        <Cite id="sui2025" />
      </p>

      <p>
        {es
          ? 'El corpus llego con cinco errores de transcripcion contra las tablas publicadas, dos de ellos sobre la variable que se predice. Se corrigieron, y la comprobacion que los encontro corre ahora en cada carga.'
          : 'The corpus arrived with five transcription errors against the published tables, two of them on the variable being predicted. They were corrected, and the check that found them now runs on every load.'}{' '}
        <Link to="/implementation">{es ? 'Como se comprueba' : 'How that is checked'}</Link>.
      </p>

      <h2>{es ? 'Alcance honesto' : 'Honest scope'}</h2>
      <ul className="fr-list">
        <li>
          {es
            ? 'No hay simulacion mecanicista. No hay elementos discretos ni modelos hibridos de tension por voladura, y una aproximacion casera bajo esos nombres seria peor que su ausencia.'
            : 'There is no mechanistic simulation. No discrete-element or hybrid stress blasting model, and a hand-rolled approximation under those names would be worse than their absence.'}
        </li>
        <li>
          {es
            ? 'La secuencia de iniciacion es coreografia. El factor de tiempo del modelo clasico modificado es un escalar sin estructura espacial, asi que cambiar el amarre mueve la animacion y no mueve ninguna prediccion.'
            : 'The initiation sequence is choreography. The timing factor in the modified classical model is a scalar with no spatial structure, so changing the tie-in moves the animation and moves no prediction.'}
        </li>
        <li>
          {es
            ? 'No hay proyeccion de rocas ni vibracion del terreno, y no hay modelo de conminucion aguas abajo.'
            : 'There is no flyrock and no ground vibration, and no downstream comminution model.'}
        </li>
        <li>
          {es
            ? 'Las constantes que ninguna fuente publica se exponen como parametros del usuario con rangos documentados, nunca inventadas.'
            : 'Constants that no source prints are exposed as user parameters with documented ranges, never invented.'}
        </li>
      </ul>

      <Refs ids={SECTION_REFS.introduction} label={es ? "Fuentes de esta pagina" : "Sources for this page"} />
    </article>
  );
}
