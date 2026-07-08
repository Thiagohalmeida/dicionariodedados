import { db, dictionariesTable, fieldsTable, validationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Iniciando seed de dados de teste...");

  try {
    // Limpar dados existentes (opcional - comentar se quiser manter)
    console.log("🧹 Limpando dados existentes...");
    await db.delete(validationsTable);
    await db.delete(fieldsTable);
    await db.delete(dictionariesTable);

    // Criar dicionário 1: RFQ Medicamentos
    console.log("📚 Criando dicionário: RFQ Medicamentos");
    const [dict1] = await db
      .insert(dictionariesTable)
      .values({
        processo: "RFQ",
        categoria: "Medicamentos",
        tabela: "rfq_item_medicamentos",
        version: 1,
        status: "pending",
      })
      .returning();

    // Campos do dicionário 1
    const fields1 = [
      {
        dictionaryId: dict1.id,
        campoOrigem: "Código do Item",
        descricao: "Código único de identificação do item na cotação",
        origem: "SAP MM",
        periodicidade: "eventual",
        campoTecnico: "cod_item",
        tipoDado: "varchar",
        chave: true,
      },
      {
        dictionaryId: dict1.id,
        campoOrigem: "Descrição do Material",
        descricao: "Descrição completa do material/medicamento",
        origem: "SAP MM",
        periodicidade: "eventual",
        campoTecnico: "desc_material",
        tipoDado: "varchar",
        chave: false,
      },
      {
        dictionaryId: dict1.id,
        campoOrigem: "Quantidade Solicitada",
        descricao: "Quantidade do item solicitada na cotação",
        origem: "SAP MM",
        periodicidade: "eventual",
        campoTecnico: "qtd_solicitada",
        tipoDado: "decimal",
        chave: false,
      },
      {
        dictionaryId: dict1.id,
        campoOrigem: "Unidade de Medida",
        descricao: "Unidade de medida do item (CX, UN, FR)",
        origem: "SAP MM",
        periodicidade: "eventual",
        campoTecnico: "unidade_medida",
        tipoDado: "varchar",
        chave: false,
      },
      {
        dictionaryId: dict1.id,
        campoOrigem: "Preço Unitário Estimado",
        descricao: "Preço unitário estimado para o item",
        origem: "SAP MM",
        periodicidade: "eventual",
        campoTecnico: "preco_unit_estimado",
        tipoDado: "decimal",
        chave: false,
      },
      {
        dictionaryId: dict1.id,
        campoOrigem: "Data de Entrega Desejada",
        descricao: "Data em que o material deve ser entregue",
        origem: "SAP MM",
        periodicidade: "eventual",
        campoTecnico: "dt_entrega_desejada",
        tipoDado: "date",
        chave: false,
      },
      {
        dictionaryId: dict1.id,
        campoOrigem: "Fornecedor Preferencial",
        descricao: "Código do fornecedor preferencial para o item",
        origem: "SAP MM",
        periodicidade: "eventual",
        campoTecnico: "fornecedor_pref",
        tipoDado: "varchar",
        chave: false,
      },
    ];

    const insertedFields1 = await db
      .insert(fieldsTable)
      .values(fields1)
      .returning();

    console.log(`  ✅ ${insertedFields1.length} campos criados`);

    // Adicionar validações para alguns campos do dicionário 1
    const validations1 = [
      {
        fieldId: insertedFields1[0].id, // Código do Item
        validatorName: "Ana Silva",
        used: true,
        required: true,
        correctName: true,
        correctOrigin: true,
        hasBusinessRule: true,
        score: "100.00",
        comment: "Campo chave primária, obrigatório e único",
      },
      {
        fieldId: insertedFields1[1].id, // Descrição do Material
        validatorName: "Carlos Santos",
        used: true,
        required: true,
        correctName: true,
        correctOrigin: true,
        hasBusinessRule: false,
        score: "80.00",
        comment: "Descrição padrão do SAP",
      },
      {
        fieldId: insertedFields1[2].id, // Quantidade
        validatorName: "Maria Oliveira",
        used: true,
        required: true,
        correctName: true,
        correctOrigin: true,
        hasBusinessRule: true,
        score: "100.00",
        comment: "Quantidade deve ser > 0",
      },
      {
        fieldId: insertedFields1[3].id, // Unidade
        validatorName: "João Pereira",
        used: true,
        required: false,
        correctName: true,
        correctOrigin: true,
        hasBusinessRule: false,
        score: "60.00",
      },
    ];

    await db.insert(validationsTable).values(validations1);
    console.log(`  ✅ ${validations1.length} validações criadas`);

    // Criar dicionário 2: Contrato Laboratório
    console.log("📚 Criando dicionário: Contrato Laboratório");
    const [dict2] = await db
      .insert(dictionariesTable)
      .values({
        processo: "Contrato",
        categoria: "Laboratório",
        tabela: "contrato_lab_exames",
        version: 1,
        status: "in_review",
      })
      .returning();

    const fields2 = [
      {
        dictionaryId: dict2.id,
        campoOrigem: "Código do Exame",
        descricao: "Código único do exame laboratorial",
        origem: "Tasy",
        periodicidade: "diario",
        campoTecnico: "cod_exame",
        tipoDado: "varchar",
        chave: true,
      },
      {
        dictionaryId: dict2.id,
        campoOrigem: "Nome do Exame",
        descricao: "Nome completo do exame laboratorial",
        origem: "Tasy",
        periodicidade: "diario",
        campoTecnico: "nome_exame",
        tipoDado: "varchar",
        chave: false,
      },
      {
        dictionaryId: dict2.id,
        campoOrigem: "Valor de Referência",
        descricao: "Valores de referência do exame (mínimo - máximo)",
        origem: "Tasy",
        periodicidade: "diario",
        campoTecnico: "val_referencia",
        tipoDado: "varchar",
        chave: false,
      },
      {
        dictionaryId: dict2.id,
        campoOrigem: "Unidade",
        descricao: "Unidade de medida do resultado",
        origem: "Tasy",
        periodicidade: "diario",
        campoTecnico: "unidade",
        tipoDado: "varchar",
        chave: false,
      },
      {
        dictionaryId: dict2.id,
        campoOrigem: "Metodologia",
        descricao: "Metodologia utilizada no exame",
        origem: "Tasy",
        periodicidade: "diario",
        campoTecnico: "metodologia",
        tipoDado: "varchar",
        chave: false,
      },
      {
        dictionaryId: dict2.id,
        campoOrigem: "Tempo de Jejum",
        descricao: "Tempo de jejum necessário em horas",
        origem: "Tasy",
        periodicidade: "diario",
        campoTecnico: "tempo_jejum",
        tipoDado: "int",
        chave: false,
      },
    ];

    const insertedFields2 = await db
      .insert(fieldsTable)
      .values(fields2)
      .returning();

    console.log(`  ✅ ${insertedFields2.length} campos criados`);

    const validations2 = [
      {
        fieldId: insertedFields2[0].id,
        validatorName: "Dra. Paula Lima",
        used: true,
        required: true,
        correctName: true,
        correctOrigin: true,
        hasBusinessRule: true,
        score: "100.00",
        comment: "Código padrão do Tasy",
      },
      {
        fieldId: insertedFields2[1].id,
        validatorName: "Dr. Ricardo Alves",
        used: true,
        required: true,
        correctName: true,
        correctOrigin: true,
        hasBusinessRule: false,
        score: "80.00",
      },
      {
        fieldId: insertedFields2[2].id,
        validatorName: "Enf. Juliana Costa",
        used: true,
        required: false,
        correctName: true,
        correctOrigin: true,
        hasBusinessRule: true,
        score: "80.00",
        comment: "Valores de referência variam por idade/sexo",
      },
    ];

    await db.insert(validationsTable).values(validations2);
    console.log(`  ✅ ${validations2.length} validações criadas`);

    // Criar dicionário 3: Compra Direta
    console.log("📚 Criando dicionário: Compra Direta TI");
    const [dict3] = await db
      .insert(dictionariesTable)
      .values({
        processo: "Compra Direta",
        categoria: "TI",
        tabela: "compra_direta_equip_ti",
        version: 1,
        status: "validated",
      })
      .returning();

    const fields3 = [
      {
        dictionaryId: dict3.id,
        campoOrigem: "Tag do Ativo",
        descricao: "Tag de identificação do equipamento",
        origem: "GLPI",
        periodicidade: "eventual",
        campoTecnico: "tag_ativo",
        tipoDado: "varchar",
        chave: true,
      },
      {
        dictionaryId: dict3.id,
        campoOrigem: "Tipo de Equipamento",
        descricao: "Categoria do equipamento (Notebook, Monitor, Dock)",
        origem: "GLPI",
        periodicidade: "eventual",
        campoTecnico: "tipo_equip",
        tipoDado: "varchar",
        chave: false,
      },
      {
        dictionaryId: dict3.id,
        campoOrigem: "Fabricante",
        descricao: "Fabricante do equipamento",
        origem: "GLPI",
        periodicidade: "eventual",
        campoTecnico: "fabricante",
        tipoDado: "varchar",
        chave: false,
      },
      {
        dictionaryId: dict3.id,
        campoOrigem: "Modelo",
        descricao: "Modelo específico do equipamento",
        origem: "GLPI",
        periodicidade: "eventual",
        campoTecnico: "modelo",
        tipoDado: "varchar",
        chave: false,
      },
      {
        dictionaryId: dict3.id,
        campoOrigem: "Número de Série",
        descricao: "Serial number do equipamento",
        origem: "GLPI",
        periodicidade: "eventual",
        campoTecnico: "num_serie",
        tipoDado: "varchar",
        chave: false,
      },
      {
        dictionaryId: dict3.id,
        campoOrigem: "Data de Aquisição",
        descricao: "Data de compra do equipamento",
        origem: "GLPI",
        periodicidade: "eventual",
        campoTecnico: "dt_aquisicao",
        tipoDado: "date",
        chave: false,
      },
      {
        dictionaryId: dict3.id,
        campoOrigem: "Valor de Aquisição",
        descricao: "Valor pago na aquisição",
        origem: "GLPI",
        periodicidade: "eventual",
        campoTecnico: "vlr_aquisicao",
        tipoDado: "decimal",
        chave: false,
      },
      {
        dictionaryId: dict3.id,
        campoOrigem: "Centro de Custo",
        descricao: "Centro de custo responsável",
        origem: "GLPI",
        periodicidade: "eventual",
        campoTecnico: "centro_custo",
        tipoDado: "varchar",
        chave: false,
      },
    ];

    const insertedFields3 = await db
      .insert(fieldsTable)
      .values(fields3)
      .returning();

    console.log(`  ✅ ${insertedFields3.length} campos criados`);

    const validations3 = [
      {
        fieldId: insertedFields3[0].id,
        validatorName: "Tiago Ribeiro",
        used: true,
        required: true,
        correctName: true,
        correctOrigin: true,
        hasBusinessRule: true,
        score: "100.00",
        comment: "Tag única por ativo",
      },
      {
        fieldId: insertedFields3[1].id,
        validatorName: "Roberto Nunes",
        used: true,
        required: true,
        correctName: true,
        correctOrigin: true,
        hasBusinessRule: false,
        score: "80.00",
      },
      {
        fieldId: insertedFields3[2].id,
        validatorName: "Fernanda Dias",
        used: true,
        required: false,
        correctName: true,
        correctOrigin: true,
        hasBusinessRule: false,
        score: "60.00",
      },
    ];

    await db.insert(validationsTable).values(validations3);
    console.log(`  ✅ ${validations3.length} validações criadas`);

    console.log("\n🎉 Seed concluído com sucesso!");
    console.log(`   - 3 dicionários criados`);
    console.log(`   - ${insertedFields1.length + insertedFields2.length + insertedFields3.length} campos criados`);
    console.log(`   - ${validations1.length + validations2.length + validations3.length} validações criadas`);

  } catch (error) {
    console.error("❌ Erro no seed:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));