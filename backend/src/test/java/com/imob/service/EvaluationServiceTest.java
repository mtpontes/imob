package com.imob.service;

import com.imob.dto.CriteriaDTO;
import com.imob.entity.TemplateEntity;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class EvaluationServiceTest {

    private final EvaluationService evaluationService = new EvaluationService();

    @Test
    public void shouldCalculateScoreCorrectlyForMixedCriteria() {
        // Arrange
        var template = new TemplateEntity();
        List<CriteriaDTO> criteriaList = new ArrayList<>();

        var c1 = new CriteriaDTO();
        c1.setId("c1");
        c1.setType("bool");
        c1.setScorable(true);
        c1.setWeight(5.0);
        criteriaList.add(c1);

        var c2 = new CriteriaDTO();
        c2.setId("c2");
        c2.setType("range");
        c2.setScorable(true);
        c2.setWeight(3.0);
        c2.setMin(1.0);
        c2.setMax(5.0);
        criteriaList.add(c2);

        var c3 = new CriteriaDTO();
        c3.setId("c3");
        c3.setType("text");
        c3.setScorable(false);
        c3.setWeight(2.0);
        criteriaList.add(c3);

        template.setCriteria(criteriaList);

        Map<String, Object> answers = new HashMap<>();
        answers.put("c1", true); // Pontua 5.0 (peso total de c1)
        answers.put("c2", 3.0);  // Pontua (3 - 1) / (5 - 1) * 3 = 0.5 * 3 = 1.5
        answers.put("c3", "Texto de observacao"); // Nao pontua

        // Act
        var finalScore = this.evaluationService.calculateFinalScore(template, answers);

        // Assert
        // Soma obtida = 5.0 + 1.5 = 6.5
        // Soma pesos = 5.0 + 3.0 = 8.0
        // Score final normalizado = (6.5 / 8.0) * 100 = 81.25
        Assertions.assertEquals(81.25, finalScore);
    }

    @Test
    public void shouldReturnZeroWhenNoScorableCriteria() {
        // Arrange
        var template = new TemplateEntity();
        List<CriteriaDTO> criteriaList = new ArrayList<>();

        var c1 = new CriteriaDTO();
        c1.setId("c1");
        c1.setType("text");
        c1.setScorable(false);
        c1.setWeight(5.0);
        criteriaList.add(c1);

        template.setCriteria(criteriaList);

        Map<String, Object> answers = new HashMap<>();
        answers.put("c1", "Observacao");

        // Act
        var finalScore = this.evaluationService.calculateFinalScore(template, answers);

        // Assert
        Assertions.assertEquals(0.0, finalScore);
    }

    @Test
    public void shouldCapRangeScoresToLimits() {
        // Arrange
        var template = new TemplateEntity();
        List<CriteriaDTO> criteriaList = new ArrayList<>();

        var c1 = new CriteriaDTO();
        c1.setId("c1");
        c1.setType("range");
        c1.setScorable(true);
        c1.setWeight(10.0);
        c1.setMin(10.0);
        c1.setMax(20.0);
        criteriaList.add(c1);

        template.setCriteria(criteriaList);

        Map<String, Object> answersUnderLimit = new HashMap<>();
        answersUnderLimit.put("c1", 5.0); // Abaixo do minimo de 10.0

        Map<String, Object> answersOverLimit = new HashMap<>();
        answersOverLimit.put("c1", 25.0); // Acima do maximo de 20.0

        // Act
        var scoreUnder = this.evaluationService.calculateFinalScore(template, answersUnderLimit);
        var scoreOver = this.evaluationService.calculateFinalScore(template, answersOverLimit);

        // Assert
        Assertions.assertEquals(0.0, scoreUnder);
        Assertions.assertEquals(100.0, scoreOver);
    }
}
