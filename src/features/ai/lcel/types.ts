// src/features/ai/lcel/types.ts
import { Runnable } from "@langchain/core/runnables";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BasePromptTemplate } from "@langchain/core/prompts";
import { BaseOutputParser } from "@langchain/core/output_parsers";
import { RunnableLike } from "@langchain/core/runnables";

export interface ChainConfiguration<TInput = any, TModelOutput = any, TFinalOutput = any> {
  /** Nombre único para identificar la cadena en el registro. */
  name: string;

  /** Descripción opcional de lo que hace la cadena. */
  description?: string;

  /** Plantilla de prompt de LangChain. */
  prompt: BasePromptTemplate;

  /** Parser de salida de LangChain. */
  parser: BaseOutputParser<TModelOutput>;

  /**
   * Opcional: Función para transformar la entrada cruda a la forma esperada por el prompt.
   * Si no se provee, se asume que la entrada ya está en el formato correcto.
   * @param rawInput La entrada original proporcionada al ejecutor de la cadena.
   * @returns Un objeto Record<string, any> que se pasará al prompt.
   */
  inputFormatter?: (rawInput: TInput) => Record<string, any>;

  /**
   * Opcional: Función para normalizar/transformar la salida parseada del modelo.
   * Esta función también es responsable de la validación final.
   * Si la validación falla o la normalización no es posible, puede lanzar un error
   * o devolver un valor que indique fallo (ej. null), que luego podría
   * llevar al uso del `defaultOutput`.
   * @param parsedOutput La salida del parser de la cadena.
   * @param rawInput La entrada original que se pasó a la cadena (útil para contexto).
   * @returns La salida final transformada y validada, o un indicador de fallo.
   */
  outputNormalizer?: (parsedOutput: TModelOutput, rawInput?: TInput) => TFinalOutput | null; // Permitir null para indicar fallo de normalización/validación

  /**
   * Opcional: Una salida por defecto a utilizar si la ejecución de la cadena falla
   * o si el `outputNormalizer` devuelve null (indicando un fallo de validación/normalización).
   */
  defaultOutput?: TFinalOutput;

  /**
   * Opcional: Permite construir una cadena (Runnable) más compleja si es necesario,
   * en lugar de la simple secuencia prompt.pipe(model).pipe(parser).
   * El modelo, prompt y parser se pasan como argumentos para que puedan ser inyectados
   * en la construcción personalizada de la cadena.
   * @param model El modelo de chat a utilizar.
   * @param prompt La plantilla de prompt configurada.
   * @param parser El parser de salida configurado.
   * @returns Un RunnableLike que representa la cadena LCEL completa.
   */
  customChainBuilder?: (
    model: BaseChatModel,
    prompt: BasePromptTemplate,
    parser: BaseOutputParser<TModelOutput>
  ) => Runnable<any, TModelOutput>;
}