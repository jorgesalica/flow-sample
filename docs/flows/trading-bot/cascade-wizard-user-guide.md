# 📘 Manual de Usuario: Asistente de Análisis de Mercado

> **Propósito**: Esta guía detalla cómo utilizar la herramienta de "Análisis en Cascada" para tomar decisiones de inversión informadas, siguiendo una metodología profesional paso a paso, desde la tendencia general hasta la ejecución precisa.

---

## 1. Introducción al Sistema

El **Asistente de Análisis** está diseñado para resolver el problema más común del trading: la falta de contexto. En lugar de operar basándose en una sola mirada rápida, el sistema te obliga a seguir un proceso lógico y ordenado:

1. **Día (1D)**: ¿Hacia dónde va la corriente principal?
2. **4 Horas (4H)**: ¿Dónde están los obstáculos (pisos y techos)?
3. **1 Hora (1H)**: ¿Hay una oportunidad formándose ahora mismo?
4. **15 Minutos (15m)**: ¿Cuál es el precio exacto para entrar?

El sistema "recuerda" lo que descubrió en el paso anterior. Por ejemplo, si en el gráfico Diario detectó una tendencia alcista, usará esa información para recomendarte compras en los gráficos de minutos.

---

## 2. Descripción de la Interfaz

En cada paso del asistente encontrarás tres elementos principales:

### A. El Gráfico Interactivo

Ocupa la parte central. Muestra las velas japonesas (precios de apertura, cierre, máximo y mínimo) para el periodo seleccionado.

* **Líneas**: Puedes ver líneas horizontales que marcan precios importantes (Soportes/Resistencias automáticas).
* **Hora Local**: El eje inferior muestra la hora exacta en tu zona horaria local.

### B. El Panel de Control (Derecha)

Aquí es donde interactúas con el sistema.

* **Botón "Generar Insight"**: Envía los datos actuales al motor de inteligencia artificial para recibir un análisis.
* **Resultados**: Una vez procesado, verás dos cajas de información:
  * **Sesgo (Tendencia)**: Una etiqueta rápida (ALCISTA, BAJISTA o NEUTRAL).
  * **Análisis Detallado**: Un párrafo de texto explicando el razonamiento.

### C. Barra de Progreso (Superior)

Indica en qué etapa del análisis te encuentras (1D > 4H > 1H > 15m) y si ya has completado los pasos anteriores (marcado con un punto verde).

---

## 3. Flujo Paso a Paso

### Paso 1: Análisis de Tendencia (Gráfico Diario)

**Objetivo**: Determinar si el mercado es seguro para operar y en qué dirección.

**Tu Tarea**:

1. Observa el gráfico. ¿Los precios de hoy son más altos que los de ayer?
2. Haz clic en **Generar Insight**.

**Interpretación de Resultados**:

* **Sesgo ALCISTA (LONG)**: La tendencia es subir. Tu mentalidad debe ser "buscar oportunidades de compra". Ignorar señales de venta.
* **Sesgo BAJISTA (SHORT)**: La tendencia es bajar. Tu mentalidad debe ser "buscar oportunidades de venta".
* **Sesgo NEUTRAL**: El mercado está lateral (sin dirección). Es el escenario más peligroso. La recomendación suele ser esperar a que rompa el rango.

---

### Paso 2: Niveles Estructurales (Gráfico de 4 Horas)

**Objetivo**: Identificar dónde "rebotará" el precio.

**Contexto Automático**: El sistema ya sabe la tendencia del Paso 1.

**Tu Tarea**:

1. Busca zonas donde el precio se haya detenido anteriormente.
2. Haz clic en **Generar Insight**.

**Explicación Detallada**:
El sistema buscará **Soportes** (pisos donde el precio suele subir) y **Resistencias** (techos donde suele bajar).

* Si vienes de una Tendencia Alcista, el sistema buscará un Soporte sólido para apoyarse.
* Si el precio está "en medio de la nada" (lejos de un soporte o resistencia), el consejo será esperar.

---

### Paso 3: Configuración y Patrones (Gráfico de 1 Hora)

**Objetivo**: Confirmar que el movimiento esperado está comenzando.

**Tu Tarea**:

1. Verifica si hay formas reconocibles en las velas (ej. una vela envolvente grande).
2. Haz clic en **Generar Insight**.

**Lo que analiza el sistema**:
El asistente busca **Patrones Técnicos**:

* **Banderas**: Pequeñas pausas antes de continuar la tendencia.
* **Divergencias**: Cuando el precio sube pero la fuerza (indicadores internos) baja, indicando un posible cambio.
* **Velas de Confirmación**: Velas específicas que indican fuerza de compradores o vendedores.

---

### Paso 4: Ejecución y Riesgo (Gráfico de 15 Minutos)

**Objetivo**: Definir los números exactos de la operación. Este es el paso final y más crítico.

**Tu Tarea**:

1. Revisar los números propuestos.
2. Decidir si la operación vale la pena.

**Elementos de la Ejecución**:
El sistema te entregará tres precios clave:

1. **Precio de Entrada**: El valor exacto al que deberías comprar o vender ahora.
2. **Stop Loss (Límite de Pérdida)**: El precio donde debes salir de la operación si el mercado se vuelve en tu contra. Esto protege tu capital.
    * *Regla*: El sistema nunca sugerirá una operación sin Stop Loss.
3. **Take Profit (Objetivo)**: El precio donde deberías cobrar tus ganancias.

**La Regla de Oro (Ratio Riesgo/Beneficio)**:
El análisis te dirá si la operación es matemáticamente rentable.

* *Ejemplo*: "Arriesgas $10 para ganar $30". Esto es un ratio 1:3 (Muy bueno).
* Si el ratio es menor a 1:2 (ej. arriesgas $10 para ganar $15), el sistema probablemente te aconseje **NO OPERAR**, aunque el gráfico se vea bien.

---

## 4. Preguntas Frecuentes

**¿Qué hago si el Paso 1 dice "Alcista" pero el Paso 4 dice "Venta"?**
El sistema suele filtrar estas contradicciones. Sin embargo, si ocurre, la regla es priorizar el **Paso 1**. No operes en contra de la tendencia principal (Macro) a menos que seas un experto en contra-tendencia. Lo mejor es cancelar y esperar.

**¿Puedo saltarme pasos?**
Técnicamente sí, pero no se recomienda. El análisis de 15 minutos carece de validez sin el contexto de las 4 horas. Un "buen precio" en 15m puede ser una trampa si está chocando contra una pared invisible en 4H.

**¿El sistema opera por mí?**
No. El Asistente es un consejero. La decisión de abrir la operación en tu bróker (Binance, Bybit, etc.) es 100% tuya.
