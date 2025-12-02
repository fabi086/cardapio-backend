import { useState } from 'react';

/**
 * Hook customizado para busca de endereço via CEP usando API ViaCEP
 */
export const useViaCep = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Formata CEP para o padrão 00000-000
     */
    const formatCep = (value) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length <= 5) {
            return cleaned;
        }
        return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
    };

    /**
     * Valida se o CEP tem formato válido
     */
    const isValidCep = (cep) => {
        const cleaned = cep.replace(/\D/g, '');
        return cleaned.length === 8;
    };

    /**
     * Busca endereço por CEP na API ViaCEP
     * @param {string} cep - CEP no formato 00000-000 ou 00000000
     * @returns {Promise<Object>} Dados do endereço ou null se não encontrado
     */
    const searchCep = async (cep) => {
        setLoading(true);
        setError(null);

        try {
            // Remove caracteres não numéricos
            const cleanCep = cep.replace(/\D/g, '');

            // Valida formato
            if (!isValidCep(cep)) {
                throw new Error('CEP inválido. Use o formato 00000-000');
            }

            // Busca na API ViaCEP
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);

            if (!response.ok) {
                throw new Error('Erro ao buscar CEP. Tente novamente.');
            }

            const data = await response.json();

            // ViaCEP retorna {erro: true} quando CEP não existe
            if (data.erro) {
                throw new Error('CEP não encontrado. Verifique o número digitado.');
            }

            return {
                cep: formatCep(cleanCep),
                street: data.logradouro || '',
                neighborhood: data.bairro || '',
                city: data.localidade || '',
                state: data.uf || '',
                complement: data.complemento || ''
            };
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        searchCep,
        formatCep,
        isValidCep,
        loading,
        error,
        clearError: () => setError(null)
    };
};
