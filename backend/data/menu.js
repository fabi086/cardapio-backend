const menuItems = [
  // BURGERS
  {
    id: 1,
    name: "X-Burger Especial",
    description: "Pão brioche, hambúrguer artesanal 180g, queijo cheddar, bacon crocante e molho especial.",
    price: 25.90,
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    modifiers: [
      {
        id: "extras",
        title: "Adicionais",
        type: "checkbox",
        options: [
          { name: "Bacon Extra", price: 4.00 },
          { name: "Queijo Extra", price: 3.00 },
          { name: "Ovo", price: 2.00 },
          { name: "Hambúrguer Extra", price: 10.00 }
        ]
      },
      {
        id: "removals",
        title: "Retirar Ingredientes",
        type: "checkbox",
        options: [
          { name: "Sem Cebola", price: 0 },
          { name: "Sem Tomate", price: 0 },
          { name: "Sem Molho", price: 0 }
        ]
      },
      {
        id: "point",
        title: "Ponto da Carne",
        type: "radio",
        options: [
          { name: "Mal Passado", price: 0 },
          { name: "Ao Ponto", price: 0 },
          { name: "Bem Passado", price: 0 }
        ]
      }
    ]
  },
  {
    id: 2,
    name: "X-Salada Clássico",
    description: "Pão com gergelim, hambúrguer 150g, queijo prato, alface americana, tomate e maionese da casa.",
    price: 22.50,
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    modifiers: [
      {
        id: "extras",
        title: "Adicionais",
        type: "checkbox",
        options: [
          { name: "Bacon", price: 4.00 },
          { name: "Queijo Extra", price: 3.00 }
        ]
      }
    ]
  },
  {
    id: 3,
    name: "Smash Burger Duplo",
    description: "Dois smash burgers de 90g, queijo cheddar duplo, cebola caramelizada e picles.",
    price: 28.90,
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 4,
    name: "Chicken Crispy",
    description: "Pão brioche, filé de frango empanado crocante, alface, tomate e maionese de ervas.",
    price: 24.00,
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1615557960916-5f4791effe9d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 5,
    name: "Veggie Burger",
    description: "Hambúrguer de grão de bico, cogumelos salteados, rúcula, tomate seco e maionese vegana.",
    price: 26.50,
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1585238342024-78d387f4a707?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },

  // PIZZAS
  {
    id: 6,
    name: "Pizza Calabresa",
    description: "Molho de tomate, mussarela, calabresa fatiada, cebola e orégano.",
    price: 45.00,
    category: "Pizzas",
    image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    modifiers: [
      {
        id: "borda",
        title: "Borda Recheada",
        type: "radio",
        options: [
          { name: "Sem Borda Recheada", price: 0 },
          { name: "Catupiry", price: 8.00 },
          { name: "Cheddar", price: 8.00 }
        ]
      }
    ]
  },
  {
    id: 7,
    name: "Pizza Margherita",
    description: "Molho de tomate, mussarela de búfala, manjericão fresco e azeite.",
    price: 48.00,
    category: "Pizzas",
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 8,
    name: "Pizza Quatro Queijos",
    description: "Mussarela, provolone, parmesão e gorgonzola.",
    price: 52.00,
    category: "Pizzas",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 9,
    name: "Pizza Portuguesa",
    description: "Mussarela, presunto, ovo, cebola, ervilha e azeitona.",
    price: 49.00,
    category: "Pizzas",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 10,
    name: "Pizza Frango com Catupiry",
    description: "Frango desfiado temperado e o autêntico Catupiry.",
    price: 50.00,
    category: "Pizzas",
    image: "https://images.unsplash.com/photo-1593560708920-63892806d936?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },

  // ACOMPANHAMENTOS
  {
    id: 11,
    name: "Batata Frita Rústica",
    description: "Porção de batatas cortadas rusticamente, temperadas com alecrim e páprica.",
    price: 18.00,
    category: "Acompanhamentos",
    image: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    modifiers: [
      {
        id: "molho",
        title: "Molho Extra",
        type: "checkbox",
        options: [
          { name: "Maionese de Ervas", price: 3.00 },
          { name: "Barbecue", price: 3.00 },
          { name: "Cheddar Cremoso", price: 4.00 }
        ]
      }
    ]
  },
  {
    id: 12,
    name: "Onion Rings",
    description: "Anéis de cebola empanados e super crocantes.",
    price: 20.00,
    category: "Acompanhamentos",
    image: "https://images.unsplash.com/photo-1639024471283-03518883512d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 13,
    name: "Nuggets de Frango",
    description: "10 unidades de nuggets crocantes.",
    price: 16.00,
    category: "Acompanhamentos",
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 14,
    name: "Batata com Cheddar e Bacon",
    description: "Nossa batata frita coberta com cheddar cremoso e farofa de bacon.",
    price: 24.00,
    category: "Acompanhamentos",
    image: "https://images.unsplash.com/photo-1585109649139-366801895172?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 15,
    name: "Dadinhos de Tapioca",
    description: "Porção com 12 unidades, acompanha geleia de pimenta.",
    price: 22.00,
    category: "Acompanhamentos",
    image: "https://images.unsplash.com/photo-1619860860774-1e2e17343432?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },

  // BEBIDAS
  {
    id: 16,
    name: "Coca-Cola Lata",
    description: "350ml",
    price: 6.00,
    category: "Bebidas",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 17,
    name: "Suco de Laranja",
    description: "Natural, 500ml",
    price: 10.00,
    category: "Bebidas",
    image: "https://images.unsplash.com/photo-1613478223719-2ab802602423?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 18,
    name: "Água Mineral",
    description: "500ml, com ou sem gás.",
    price: 4.00,
    category: "Bebidas",
    image: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 19,
    name: "Cerveja Heineken",
    description: "Long Neck 330ml",
    price: 12.00,
    category: "Bebidas",
    image: "https://images.unsplash.com/photo-1618885472179-5e474019f2a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 20,
    name: "Milkshake de Chocolate",
    description: "500ml, feito com sorvete artesanal.",
    price: 18.00,
    category: "Bebidas",
    image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  }
];

const categories = ["Todos", "Burgers", "Pizzas", "Acompanhamentos", "Bebidas"];

module.exports = { menuItems, categories };
