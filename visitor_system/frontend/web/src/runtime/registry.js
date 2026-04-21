(function registerVisitorRuntime(global) {
  const runtime = global.VisitorRuntime || {};
  const registries = runtime.registries || {
    adminPages: {},
    adminBehaviors: {},
    visitorBehaviors: {},
  };
  const instances = runtime.instances || {
    adminBehaviors: {},
    visitorBehaviors: {},
  };
  const services = runtime.services || {};

  function getRegistry(name) {
    if (!registries[name]) {
      registries[name] = {};
    }
    return registries[name];
  }

  function getInstances(name) {
    if (!instances[name]) {
      instances[name] = {};
    }
    return instances[name];
  }

  function replaceInstances(name, nextMap) {
    const target = getInstances(name);
    Object.keys(target).forEach((key) => delete target[key]);
    Object.assign(target, nextMap);
    return target;
  }

  function getService(name) {
    return services[name] || null;
  }

  function setService(name, value) {
    services[name] = value;
    return value;
  }

  runtime.registries = registries;
  runtime.instances = instances;
  runtime.services = services;
  runtime.getRegistry = getRegistry;
  runtime.getInstances = getInstances;
  runtime.replaceInstances = replaceInstances;
  runtime.getService = getService;
  runtime.setService = setService;

  global.VisitorRuntime = runtime;
})(window);
