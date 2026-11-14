# Contribuir a APDR — Análisis de Problemas, Decisiones y Riesgos

Propón mejoras mediante Pull Requests; reporta problemas o ideas mediante Issues.

**Kidlin, Working Backwards, diseño por sustracción y shift-left testing** son la base integrada. Problema real, resultado útil, complejidad justificada y evidencia se retroalimentan. Los requisitos, riesgos y pruebas están a su servicio: conservar los nombres sin su aplicación no basta.

APDR ayuda en requisitos, diseño, desarrollo, pruebas, producción y mantenimiento. Conserva este criterio: **resolver desde la fase actual, prevenir lo antes posible y simplificar sin perder valor**. La prevención temprana busca reducir costo, esfuerzo y retrabajo; no limita el uso a requisitos ni convierte una corrección tardía en una prueba temprana.

1. Crea una rama o un fork y describe el problema, la fase del trabajo y el resultado útil esperado.
2. Modifica la única fuente de instrucciones, `skills/apdr/SKILL.md`, o la documentación pertinente. Justifica qué simplificas, reutilizas o necesitas añadir. No retires controles necesarios solo por reducir texto o pasos.
3. Contrasta supuestos y regresiones durante el cambio. Abre un PR con la evidencia, sus límites y el resultado observado; espera la revisión del mantenedor.

Para cambios de razonamiento, compara antes y después con casos relevantes: confusión conceptual, fuentes en conflicto, cálculos, funciones innecesarias, pérdida de un control o una petición sencilla. Si cambia el alcance o la activación, incluye un requisito ambiguo, un defecto durante desarrollo o pruebas y un incidente en producción. Comprueba que no se fuerce el mismo procedimiento, no se retrase una contención segura por completar un informe y no se asuman permisos para actuar. Incluye una petición que no deba activar APDR. Comprueba transferencia a otro dominio cuando corresponda.

Evalúa decisiones y comprensión, no repetición de los cuatro fundamentos. Registra la versión, el entorno y el modelo cuando se conozca. Distingue revisión de instrucciones, simulación y ejecución real; no afirmes pruebas no realizadas. La comprobación automática de instalación no evalúa por sí sola el razonamiento.

Conserva `apdr` como identificador y nombre de carpeta. Si cambia el alcance, uso o instalación, actualiza también README, metadatos y comprobaciones pertinentes. No añadas copias alternativas de la skill, scripts o dependencias sin una necesidad concreta.

No publiques credenciales, datos personales ni información confidencial.
