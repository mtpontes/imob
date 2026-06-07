package com.imob.service;

import com.imob.dto.CriteriaDTO;
import com.imob.entity.ScriptEntity;
import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Map;

@ApplicationScoped
@RegisterForReflection
public class EvaluationService {

    public double calculateFinalScore(ScriptEntity script, Map<String, Object> answers) {
        if (script == null || script.getCriteria() == null || script.getCriteria().isEmpty() || answers == null || answers.isEmpty()) 
            return 0.0;

        double totalWeight = 0.0;
        double earnedPoints = 0.0;

        for (CriteriaDTO criteria : script.getCriteria()) {
            if (!criteria.isScorable()) 
                continue;

            Object rawValue = answers.get(criteria.getId());
            if (rawValue == null) 
                continue;

            double weight = criteria.getWeight();
            double pointsForCriteria = this.calculateCriteriaPoints(criteria, rawValue);
            
            earnedPoints += pointsForCriteria;
            totalWeight += weight;
        }

        if (totalWeight == 0.0) 
            return 0.0;

        // Retorna a pontuacao normalizada de 0.0 a 100.0
        double score = (earnedPoints / totalWeight) * 100.0;
        
        // Arredonda para 2 casas decimais
        return Math.round(score * 100.0) / 100.0;
    }

    private double calculateCriteriaPoints(CriteriaDTO criteria, Object rawValue) {
        double weight = criteria.getWeight();
        String type = criteria.getType();

        if ("bool".equalsIgnoreCase(type)) {
            boolean val = this.convertToBoolean(rawValue);
            if (val) 
                return weight;
            return 0.0;
        }

        if ("range".equalsIgnoreCase(type)) {
            Double val = this.convertToDouble(rawValue);
            if (val == null) 
                return 0.0;

            double min = criteria.getMin() != null ? criteria.getMin() : 0.0;
            double max = criteria.getMax() != null ? criteria.getMax() : 100.0;

            if (max <= min) 
                return 0.0;

            if (val <= min) 
                return 0.0;

            if (val >= max) 
                return weight;

            double proportion = (val - min) / (max - min);
            return proportion * weight;
        }

        // Tipo text ou outro nao possui pontuacao numerica direta
        return 0.0;
    }

    private boolean convertToBoolean(Object val) {
        if (val instanceof Boolean) 
            return (Boolean) val;
        if (val instanceof String) 
            return Boolean.parseBoolean((String) val);
        if (val instanceof Number) 
            return ((Number) val).doubleValue() > 0;
        return false;
    }

    private Double convertToDouble(Object val) {
        if (val instanceof Number) 
            return ((Number) val).doubleValue();
        if (val instanceof String) {
            try {
                return Double.parseDouble((String) val);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
